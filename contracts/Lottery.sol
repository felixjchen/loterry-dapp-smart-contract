//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Lottery {
  address private ownerAddress;
  address[2] private managerAddress;

  uint256 private ticketPrice;
  uint256 private feeTotal;
  mapping(address => uint256) private tickets;

  event Incoming(address, uint256);
  event Outgoing(address, uint256);

  // https://ethereum.org/en/developers/tutorials/transfers-and-approval-of-erc-20-tokens-from-a-solidity-smart-contract/
  lotteryMokToken public token;

  // Constructor is run once upon deploying SC... used to set intial state
  constructor(lotteryMokToken mokTokenAddress) {
    // In the constructor... msg.sender is the owner of smart contract
    ownerAddress = msg.sender;

    token = mokTokenAddress;
    ticketPrice = 20;
  }

  function buyTickets(int256 ticketCount) public {
    require(ticketCount > 0, "non-positive ticketCount");

    uint256 unsignedTicketCount = uint256(ticketCount);
    uint256 totalPrice = unsignedTicketCount * ticketPrice;
    uint256 availableToSpend = token.allowance(msg.sender, address(this));
    require(availableToSpend >= totalPrice, "msg.sender approved too little");

    // At this point, msg.sender has enough allowance to buy the tickets they want & they're actually buying tickets
    bool success = token.transferFrom(msg.sender, address(this), totalPrice);
    require(success, "error during transferFrom");
    emit Incoming(msg.sender, totalPrice);

    // We have payment.. everything else is book keeping on our side
    tickets[msg.sender] += unsignedTicketCount;
    feeTotal += totalPrice / 20;
  }

  function getTickets() public view returns (uint256) {
    return tickets[msg.sender];
  }

  modifier onlyOwner() {
    require(msg.sender == ownerAddress, "msg.sender must be owner");
    _;
  }

  // Dumps entire feeTotal into recipient's address.
  // Only owner can call this function
  function ownerWithdrawERC20(address recipient) public onlyOwner {
    bool success = token.transfer(recipient, feeTotal);
    require(success, "error during transfer");
    feeTotal = 0;
    emit Outgoing(recipient, feeTotal);
  }
}

// Inheriting from ERC20 gives us basic fungible token methods
// https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#core
contract lotteryMokToken is ERC20 {
  // Constructor is run once upon deploying SC... used to set intial state
  constructor() ERC20("lotteryMokToken", "MOK") {
    // In the constructor... msg.sender is the owner of smart contract
  }

  function mint(uint256 amount) public {
    _mint(msg.sender, amount);
  }
}
