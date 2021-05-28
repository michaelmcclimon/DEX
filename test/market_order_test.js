const Dex = artifacts.require("Dex")
const Link =artifacts.require("LINK")
const truffleAssert = require('truffle-assertions');

contract("Dex", accounts => {

    //When creating a SELL market ordrer, the seller needs enough tokens for the trade,
    it("Should throw an error if the seller does not have enough tokens for the trade.", async () => {
        let dex = await Dex.deployed()

        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "Inital balance is not 0");

        await truffleAssert.reverts(dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10))
    })

    //Market order can be submited even with a 0 balance on the books.
    it("Should be able to put in market order even when book is empty", async () => {
        let dex = await Dex.deployed()

        await dex.depositEth({value: 50000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0); //Getting Buy side orderbook
        assert(orderbook.length == 0, "Buy side Orderbook length is not 0");

        await truffleAssert.passes(dex.createMarketOrder(web3.utils.fromUtf8("LINK"), 10))
    })

    //Market orders will be filled until the order book is empty or the market order is 100% filled
    it("Market orders should not fill more limit orders than the market order amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Getting Sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test!");

        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Seding Link tokens to accounts 1,2,3 form account 0.
        await link.transfer(accounts[1], 150)
        await link.transfer(accounts[2], 150)
        await link.transfer(accounts[3], 150)

        //Approve DEX for accounts 1,2,3
        await link.approve(dex.address, 50, {from: accounts[1]});
        await link.approve(dex.address, 50, {from: aacounts[2]});
        await link.approve(dex.address, 50, {from: accounts[3]});

        //Deposit LINK into DEX for accounts 1,2,3
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[1]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[2]});
        await dex.deposit(50, web3.utils.fromUtf8("LINK"), {from: accounts[3]});

        //Fill up the sell order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, {from: accounts[3]})

        //create market order that should fill 2/3rd's orders in the book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get Sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should onlu have 1 order left");
        assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");
    })

    //Market order should be filled until the order book is empty or the market order is 100% filled
    it("Market orders should be filled until the order book is empty", async () => {
        let dex = await Dex.deployed()
        
        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should have 1 order left");

        //Fill up the sell order book again
        await dex.createLimitOrder( 1, web3.utils.fromUtf8("LINK"), 5, 400, {from:accounts[1]})
        await dex.createLimitOrder( 1, web3.utils.fromUtf8("LINK"), 5, 500, {from:accounts[2]})

        //Check buy link balance before link purchase
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        //Create market order that could fill more that the entire order book (15 link)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 50);
        
        //Check buy link balance after purchase
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

        //Buyer should have 15 more link after, even though order was for 50.
        assert.equal(balancesBefore.toNumber() + 15, balanceAfter.toNumber());
    })

    //The Eth balance of the buyer should decrease with the filled amount
    it("The Eth balance of the buyer shoud decrease with the filled amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        //Seller deposits link and creates a sell limt order for 1 link for 300 wei
        await link.approve(dex.address, 500, {from: accounts[1]});
        await createLimitOrder(1,  web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]})

        //Check buyer ETH balance before trade
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

        assert.equal(balanceBefore.toNumber() - 300, balanceAfter.toNumber());
    })

    //The token balances of the limit order sellers hsould decrease with the filled amounts.
    it("The token balances of the limit order sellers hsould decrease with the filled amounts.", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Getting the sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        //Seller account[2] deposits link
        await link.approve(dex.address, 500, {from: accounts[2]});
        await dex.deposit(100, web3.utils.fromUtf8("LINK"), {from: accounts[2]});

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 400, {from: accounts[2]})

        //Check balances of sellers before trade
        let account1BalanceBefore = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2BalanceBefore = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

        //Acount[0] created markety order to buy up both sell orders
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        //Check sellers link balances after trade
        let account1BalanceAfter = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
        let account2BalanceAfter = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

        assert.equal(account1BalanceBefore.toNumber() - 1, account1BalanceAfter.toNumber());
        assert.equal(account2BalanceBefore.toNumber() - 1, account2BalanceAfter.toNumber());
    })

    //Filled limit orders should be removed from the orderbook
    it("Filled llimit orders should be removed from the orderbook", async () => {
        let dex = await dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Seller deposits link and creates a sell limit order for 1 link
        await link.approve(dex.address, 500);
        await dex.deposit(50, web3.utils.fromUtf8("LINK"));

        await dex.depositEth({value: 10000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Gettting sell side orderbook

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300)
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Getting sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty after trade");
    })

    //Partly filled lim,it orders should be modified to represent the filled/remaining amount
    it("Limit orders filled properley should be set correcctly after a trade", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Getting sell side orderbook
        assert(orderbook.length == 0, "Sell side orderbook should be empty at start of test");

        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from:accounts[1]})
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

        orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Getting the sell side orderbook
        assert.equal(orderbook[0].filled, 2);
        assert.equal(orderbook[0].amount,  5);
    })

      //When creating a BUY market order, the buyer needs to have enough ETH for the trade
      it("Should throw an error when creating a buy market order without adequate ETH balance", async () => {
        let dex = await Dex.deployed()
        
        let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})

        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 5, {from: accounts[4]})
        )
    })

})
