// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts@5.0.2/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts@5.0.2/utils/Nonces.sol";

/// Notificado cuando el arbitro electo se queda sin FDT, para disparar una re-eleccion.
interface IFenrirGovernorArbiter {
    function arbiter() external view returns (address);
    function notifyArbiterDivested() external;
}

/// @title FenrirToken (FDT)
/// @notice ERC-20 de inversion y gobernanza de un proyecto Fenrir. Se mintea 1:1 (wei ETH
/// invertido : wei FDT) al invertir, usa checkpoints de ERC20Votes como snapshot de votacion,
/// y se quema al reclamar reparto o reembolso. Una instancia por proyecto, desplegada por
/// FenrirFactory.
contract FenrirToken is ERC20, ERC20Permit, ERC20Votes {
    address public immutable factory;
    address public project;
    address public governor;
    bool private _initialized;

    address[] private _holders;
    mapping(address => bool) private _isHolder;

    constructor(string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
    {
        factory = msg.sender;
    }

    /// Une el token a su proyecto y su governor. Lo llama la factory una sola vez, justo
    /// despues de desplegar las tres instancias (rompe la dependencia circular entre ellas).
    function initialize(address project_, address governor_) external {
        require(msg.sender == factory, "FenrirToken: only factory");
        require(!_initialized, "FenrirToken: already initialized");
        project = project_;
        governor = governor_;
        _initialized = true;
    }

    modifier onlyProject() {
        require(msg.sender == project, "FenrirToken: only project");
        _;
    }

    function mint(address to, uint256 amount) external onlyProject {
        _mint(to, amount);
    }

    /// Quema sin requerir allowance: la usa el proyecto para los flujos de reclamo
    /// (reembolso o reparto), donde quien dispara la quema es el propio dueno del balance
    /// a traves de una funcion del proyecto, no el holder llamando directo al token.
    function projectBurn(address account, uint256 amount) external onlyProject {
        _burn(account, amount);
    }

    function holdersCount() external view returns (uint256) {
        return _holders.length;
    }

    function holderAt(uint256 index) external view returns (address) {
        return _holders[index];
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);

        if (to != address(0) && !_isHolder[to]) {
            _isHolder[to] = true;
            _holders.push(to);
        }

        if (from != address(0) && governor != address(0)) {
            address currentArbiter = IFenrirGovernorArbiter(governor).arbiter();
            if (currentArbiter != address(0) && from == currentArbiter && balanceOf(from) == 0) {
                IFenrirGovernorArbiter(governor).notifyArbiterDivested();
            }
        }
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
