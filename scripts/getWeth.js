const { getNamedAccounts, ethers, network } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

const AMOUNT = ethers.utils.parseEther("0.02")

async function getWeth() {
    const { deployer } = await getNamedAccounts()
    //We need the ABI and the CONTRACT ADDRESS to interact with the contract
    const iWeth = await ethers.getContractAt(
        "IWeth",
        networkConfig[network.config.chainId].wethToken,
        deployer
    )

    //We deposit some amount
    const tx = await iWeth.deposit({ value: AMOUNT })
    //We wait...
    await tx.wait(1)
    //We get the balance
    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Got ${wethBalance.toString()}WETH`)
}

module.exports = { getWeth, AMOUNT }
