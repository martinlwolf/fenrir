# Problema del Deploy

Va el código de la opción A. Son 3 archivos nuevos + cambios solo en createProject (y sus imports) + el linkeo en el deploy. No toca nada de Token/Governor/Project.

1. Tres librerías nuevas en contracts/src/deployers/
TokenDeployer.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../FenrirToken.sol";

/// Saca el `new FenrirToken` del bytecode de la Factory. Como es una library `external`,
/// se invoca por delegatecall: `address(this)` sigue siendo la Factory, asi que el token
/// se crea con `msg.sender == factory` (no cambian los constructores ni los immutable).
library TokenDeployer {
    function deploy(string memory name_, string memory symbol_) external returns (address) {
        return address(new FenrirToken(name_, symbol_));
    }
}
```
GovernorDeployer.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../FenrirGovernor.sol";

library GovernorDeployer {
    function deploy(address token_, FenrirGovernor.VotingMode votingMode_) external returns (address) {
        return address(new FenrirGovernor(token_, votingMode_));
    }
}
```
ProjectDeployer.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../FenrirProject.sol";

library ProjectDeployer {
    function deploy(
        address token_,
        address governor_,
        address developer_,
        FenrirProject.ProjectType projectType_,
        uint256 fmpa_,
        uint256 ff_,
        uint256 fundingDeadline_,
        uint256[] memory milestoneBudgets_,
        uint256[] memory milestoneDurations_,
        uint256 estimatedSalePrice_
    ) external returns (address) {
        return address(
            new FenrirProject(
                token_,
                governor_,
                developer_,
                projectType_,
                fmpa_,
                ff_,
                fundingDeadline_,
                milestoneBudgets_,
                milestoneDurations_,
                estimatedSalePrice_
            )
        );
    }
}
```


2. FenrirFactory.sol — imports nuevos (junto a los que ya tenés)
```solidity
import "./deployers/TokenDeployer.sol";
import "./deployers/GovernorDeployer.sol";
import "./deployers/ProjectDeployer.sol";
3. FenrirFactory.sol — createProject (reemplaza el cuerpo desde los new hasta el emit)

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
            estimatedSalePrice
        );

        // initialize las llama la Factory directo -> msg.sender == factory, pasa el require
        FenrirToken(token).initialize(project, governor);
        FenrirGovernor(governor).initialize(project);

        isFenrirProject[project] = true;
        allProjects.push(project);
        projectAddress = project;

        emit ProjectCreated(projectAddress, token, governor, msg.sender, projectType);
```

Lo único que cambia respecto a tu versión: las variables pasan a ser address (en vez de FenrirToken/FenrirGovernor/FenrirProject) y por eso initialize se llama casteando FenrirToken(token) / FenrirGovernor(governor). El resto (los require de arriba, el constructor, los certificados) queda igual.

4. Deploy: hay que linkear las libraries antes de la Factory
```solidity
// scripts/deploy.ts (Hardhat + ethers v6)
const tokenDeployer = await ethers.deployContract("TokenDeployer");
const governorDeployer = await ethers.deployContract("GovernorDeployer");
const projectDeployer = await ethers.deployContract("ProjectDeployer");
await Promise.all([
  tokenDeployer.waitForDeployment(),
  governorDeployer.waitForDeployment(),
  projectDeployer.waitForDeployment(),
]);

const Factory = await ethers.getContractFactory("FenrirFactory", {
  libraries: {
    TokenDeployer: await tokenDeployer.getAddress(),
    GovernorDeployer: await governorDeployer.getAddress(),
    ProjectDeployer: await projectDeployer.getAddress(),
  },
});
const factory = await Factory.deploy();
await factory.waitForDeployment();
```

Por qué funciona y queda chica: cada library lleva embebido el bytecode de creación de UN solo contrato (~11–14 KB → cada una bien por debajo de 24 KB) y se despliega aparte; la Factory solo guarda sus direcciones y las llama por delegatecall, así que su bytecode baja de 46 KB a ~8 KB (su lógica propia + los 2 certificados, que se siguen creando en el constructor).

¿Querés que lo aplique y lo compile para confirmar los tamaños?