pragma solidity 0.8.4;
pragma abicoder v2;

import "./wallet.sol";

contract Dex is Wallet {

    using SafeMath for uint256;

    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
        uint filled;
    }

    uint public nextOrderId;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;

    function getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory) {
        return orderBook[ticker][uint(side)];
    }

    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public {
        if(side == Side.BUY) {
            require(balances[msg.sender]["ETH"] >= amount.mul(price), "Balance too low!!");
        }
        if(side == Side.SELL) {
            require(balances[msg.sender][ticker] >= amount, "Balance too low!!");
        }

        Order[] storage orders = orderBook[ticker][uint(side)];
        orders.push(Order(nextOrderId, msg.sender, side, ticker, amount, price, 0));
        Order storage newOrder = orders[orders.length -1];

        uint m = orders.length > 0 ? orders.length - 1 : 0;

        if(side == Side.BUY) {
            while(m >0){
                if(orders[m-1].price > orders[m].price) {
                    break;
                }
                Order memory orderToMove = orders[m - 1];
                orders[m-1] = orders[1];
                orders[m] = orderToMove;
                m--;
            }
        }
        else if (side == Side.SELL){
            while(m > 0) {
                if(orders[m - 1].price < orders[m].price) {
                    break;
                }
                Order memory orderToMove = orders[m-1];
                orders[m-1] = orders[m];
                orders[m] = orderToMove;
                m--;
            }
        }
        nextOrderId++;

    }

    function createMarketOrder(Side side, bytes32 ticker, uint amount) public {
        if(side ==Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Not enough funds");
        }

        uint orderBookSide;
        if(side == Side.BUY){
            orderBookSide = 1;
        }
        else{
            orderBookSide = 0;
        }
        Order[] storage orders = orderBook[ticker][orderBookSide];

        uint totalFilled = 0;

        for (uint256 m = 0; m < orders.length && totalFilled < amount; m++) {
            uint leftToFill = amount.sub(totalFilled); 
            uint availableToFill = orders[m].amount.sub(orders[m].filled);
            uint filled = 0;
            if(availableToFill > leftToFill){
                filled = leftToFill;
            }
            else{
                filled = availableToFill;
            }

            totalFilled = totalFilled.add(filled);
            orders[m].filled = orders[m].filled.add(filled);
            uint cost = filled.mul(orders[m].price);

            if(side == Side.BUY){
                require(balances[msg.sender]["ETH"] >= cost);

                balances[msg.sender][ticker] = balances[msg.sender][ticker].add(filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(cost);

                balances[orders[m].trader][ticker] = balances[orders[m].trader][ticker].sub(filled);
                balances[orders[m].trader]["ETH"] = balances[orders[m].trader]["ETH"].add(cost);
            }
            else if(side == Side.SELL){
                balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(cost);

                balances[orders[m].trader][ticker] = balances[orders[m].trader][ticker].sub(filled);
                balances[orders[m].trader]["ETH"] = balances[orders[m].trader]["ETH"].sub(cost);
            }

        }
        while(orders.length > 0 && orders[0].filled == orders[0].amount){
            for (uint256 m = 0; m < orders.length - 1; m++) {
                orders[m] = orders[m + 1];
            }
            orders.pop();
        }
    }
}
