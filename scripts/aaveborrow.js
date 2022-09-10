const { ethers, getNamedAccounts, network } = require("hardhat")
const { BigNumber } = require("@ethersproject/bignumber")
const { getWeth, AMOUNT } = require("../scripts/getWeth.js")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)

    //We make this deposit after approving and the Deposit will get done!!!
    const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing WETH...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Desposited!")

    // We do this after making that borrow function, here we are Getting our borrowing stats, we now run scripts
    //to see how much we can borrow and the rest... we can now use this to borrow DAI but lets make a function
    //to get that DAI price
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)
    // ---------------------------------------------------------------------

    // we now call the price
    const daiPrice = await getDaiPrice()
    //Now we figure out the amount we can borrow in DAI
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    //we need that amount in WEI anyways so we do
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    //we now make that borrowDai function------------------------------------------>>>>>>>>

    //We await it after making that borrowDai function, we say:
    await borrowDai(
        networkConfig[network.config.chainId].daiToken,
        lendingPool, //lendingPool contract
        amountDaiToBorrowWei,
        deployer
    )
    //Then we get this getBorrowUserData again to print out information about where we are.
    await getBorrowUserData(lendingPool, deployer)
    //We can run scripts -------------------------------------------------------------------------

    //After that repay function, we now do :
    await repay(
        amountDaiToBorrowWei,
        networkConfig[network.config.chainId].daiToken,
        lendingPool,
        deployer
    )
    //We now do this to print out the final amount
    await getBorrowUserData(lendingPool, deployer)
}
//SIXTH FUNCTION

//After running scripts, we can now decide to Repay
async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}
//FIFTH FUNCTION

//Borrow Dai function after getting that Dai Price
async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}
//We get DAI price by using the chainlink pricefeed and make that Aggregator interface
//we dont need to connect this to a signer cos we arent sending any transactions, we are just
//reading from the contract, we run scripts

//FOURTH FUNCTION
async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId].daiEthPriceFeed
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}
//SECOND FUNCTION
async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signer)
    txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log("Approved!")
}

//FIRST FUNCTION
async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

//THIRD FUNCTION

// We make this borrow function after approving and depositing our collateral and
// we give it the lendingPool and deployer as parameters
async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
