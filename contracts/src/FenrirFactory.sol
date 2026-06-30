// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// import "@openzeppelin/contracts/token/ERC721@5.0.1/ERC721.sol"; // import de remix
import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; // import local

import "./FenrirToken.sol";
import "./FenrirGovernor.sol";
import "./FenrirProject.sol";
import "./interfaces/IFenrirFactoryCallback.sol";
import "./deployers/TokenDeployer.sol";
import "./deployers/GovernorDeployer.sol";
import "./deployers/ProjectDeployer.sol";

/// Soulbound: se emite una sola vez por proyecto exitoso y queda fija en la wallet del
/// desarrollador para siempre (no transferible).
contract FenrirCompletionCertificate is ERC721 {
    address public immutable factory;
    uint256 public nextTokenId = 1;

    constructor(
        address factory_
    ) ERC721("Fenrir Completion Certificate", "FENRIR-OK") {
        factory = factory_;
    }

    function mintTo(address developer_) external returns (uint256 tokenId) {
        require(
            msg.sender == factory,
            "FenrirCompletionCertificate: only factory"
        );
        tokenId = nextTokenId++;
        _safeMint(developer_, tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        require(
            _ownerOf(tokenId) == address(0),
            "FenrirCompletionCertificate: soulbound"
        );
        return super._update(to, tokenId, auth);
    }
}

/// Complemento negativo del certificado de finalizacion: se emite cada vez que un proyecto
/// del desarrollador se cancela, tambien soulbound.
contract FenrirFailureCertificate is ERC721 {
    address public immutable factory;
    uint256 public nextTokenId = 1;

    constructor(
        address factory_
    ) ERC721("Fenrir Failure Certificate", "FENRIR-FAIL") {
        factory = factory_;
    }

    function mintTo(address developer_) external returns (uint256 tokenId) {
        require(
            msg.sender == factory,
            "FenrirFailureCertificate: only factory"
        );
        tokenId = nextTokenId++;
        _safeMint(developer_, tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        require(
            _ownerOf(tokenId) == address(0),
            "FenrirFailureCertificate: soulbound"
        );
        return super._update(to, tokenId, auth);
    }
}

/// @title FenrirFactory
/// @notice Punto de entrada del sistema. Crea proyectos nuevos (Inversion o Civico) y
/// despliega, para cada uno, su propia instancia vinculada de FenrirToken, FenrirGovernor y
/// FenrirProject. Tambien es el registro global de reputacion del desarrollador -- emite el
/// Certificado de Finalizacion y el Certificado de Proyecto Fallido -- porque esa reputacion
/// debe poder consultarse a traves de todos los proyectos de una wallet, no por proyecto.
/// Conoce todos los proyectos que él creo. Ese registro historico lo usa para validar llamados.
contract FenrirFactory is IFenrirFactoryCallback {
    struct DeveloperIdentity {
        string razonSocial;
        string cuit;
        bool registered;
    }

    FenrirCompletionCertificate public immutable completionCertificate;
    FenrirFailureCertificate public immutable failureCertificate;

    mapping(address => DeveloperIdentity) public developers;
    mapping(string => address) public cuitToWallet;
    mapping(address => bool) public isFenrirProject; // da una address y te dice si es un proyecto que creo esta factory. cada proyecto es un address
    address[] public allProjects;

    event DeveloperRegistered(
        address indexed wallet,
        string razonSocial,
        string cuit
    );
    event ProjectCreated(
        address indexed project,
        address indexed token,
        address indexed governor,
        address developer,
        FenrirProject.ProjectType projectType
    );

    constructor() {
        completionCertificate = new FenrirCompletionCertificate(address(this));
        failureCertificate = new FenrirFailureCertificate(address(this));
    }

    /// Verificacion de identidad off-chain minima: razon social + CUIT, validando solo el
    /// digito verificador (no se consulta un padron real como AFIP). La primera wallet que
    /// registra un CUIT queda como la unica wallet valida para ese CUIT, para que un
    /// desarrollador no pueda abandonar una wallet manchada por fracasos y arrancar de cero.
    function registerDeveloper(
        string calldata razonSocial,
        string calldata cuit
    ) external {
        require(
            bytes(razonSocial).length > 0,
            "FenrirFactory: razonSocial required"
        );
        require(_isValidCuit(cuit), "FenrirFactory: invalid CUIT");
        address boundWallet = cuitToWallet[cuit];
        require(
            boundWallet == address(0) || boundWallet == msg.sender,
            "FenrirFactory: CUIT bound to another wallet"
        );

        developers[msg.sender] = DeveloperIdentity({
            razonSocial: razonSocial,
            cuit: cuit,
            registered: true
        });
        if (boundWallet == address(0)) {
            cuitToWallet[cuit] = msg.sender;
        }
        emit DeveloperRegistered(msg.sender, razonSocial, cuit);
    }

    function createProject(
        string calldata tokenName,
        string calldata tokenSymbol,
        FenrirProject.ProjectType projectType,
        FenrirGovernor.VotingMode votingMode,
        uint256 fmpa,
        uint256 ff,
        uint256 fundingDeadline,
        uint256[] calldata milestoneBudgets,
        uint256[] calldata milestoneDurations,
        string[] calldata milestoneDescriptions,
        uint256 estimatedSalePrice
    ) external returns (address projectAddress) {
        require(
            developers[msg.sender].registered,
            "FenrirFactory: developer not registered"
        );
        require(
            projectType == FenrirProject.ProjectType.Civic ||
                votingMode == FenrirGovernor.VotingMode.ByToken,
            "FenrirFactory: Investment requires token-weighted voting"
        );

        address token = TokenDeployer.deploy(tokenName, tokenSymbol);
        address governor = GovernorDeployer.deploy(token, votingMode);
        address project = ProjectDeployer.deploy(
            token,
            governor,
            msg.sender,
            projectType,
            fmpa,
            ff,
            fundingDeadline,
            milestoneBudgets,
            milestoneDurations,
            milestoneDescriptions,
            estimatedSalePrice
        );

        // initialize las llama la Factory directo -> msg.sender == factory, pasa el require
        FenrirToken(token).initialize(project, governor);
        FenrirGovernor(governor).initialize(project);

        isFenrirProject[project] = true;
        allProjects.push(project);
        projectAddress = project;

        emit ProjectCreated(
            projectAddress,
            token,
            governor,
            msg.sender,
            projectType
        );
    }

    modifier onlyKnownProject() {
        require(
            isFenrirProject[msg.sender],
            "FenrirFactory: only a Fenrir project"
        );
        _;
    }

    function recordSuccess(
        address developerAddr
    ) external override onlyKnownProject {
        completionCertificate.mintTo(developerAddr);
    }

    function recordFailure(
        address developerAddr
    ) external override onlyKnownProject {
        failureCertificate.mintTo(developerAddr);
    }

    function projectsCount() external view returns (uint256) {
        return allProjects.length;
    }

    /// Valida el digito verificador de un CUIT argentino (11 digitos), sin consultar un
    /// padron real -- la verificacion de identidad es deliberadamente liviana para los
    /// fines de este proyecto de seminario.
    function _isValidCuit(string memory cuit) internal pure returns (bool) {
        bytes memory b = bytes(cuit);
        if (b.length != 11) return false;

        uint8[11] memory digits;
        for (uint256 i = 0; i < 11; i++) {
            uint8 c = uint8(b[i]);
            if (c < 48 || c > 57) return false;
            digits[i] = c - 48;
        }

        uint8[10] memory weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        uint256 sum = 0;
        for (uint256 i = 0; i < 10; i++) {
            sum += uint256(digits[i]) * weights[i];
        }

        uint256 mod = sum % 11;
        if (mod == 0) {
            return digits[10] == 0;
        }
        uint256 expected = 11 - mod;
        if (expected == 10) return false;
        return digits[10] == expected;
    }
}
