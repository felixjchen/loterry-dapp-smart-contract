//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Lottery {
  address private ownerAddress;
  address[2] private managerAddress;

  address[] private tickets;
  uint256 private ticketPrice;
  uint256 private feeTotal;

  uint256 private prizeTotal;
  uint256 private lastDrawTime;

  event Incoming(address, uint256);
  event Outgoing(address, uint256);

  // https://ethereum.org/en/developers/tutorials/transfers-and-approval-of-erc-20-tokens-from-a-solidity-smart-contract/
  MockToken public token;

  // Constructor is run once upon deploying SC... used to set intial state
  constructor(MockToken mockTokenAddress) {
    // In the constructor... msg.sender is the owner of smart contract
    ownerAddress = msg.sender;

    token = mockTokenAddress;
    ticketPrice = 20;
    lastDrawTime = block.timestamp - (60 * 5);
  }

  function buyTickets(uint256 ticketCount) public {
    require(ticketCount > 0, "negative ticketCount");

    uint256 totalPrice = ticketCount * ticketPrice;
    uint256 availableToSpend = token.allowance(msg.sender, address(this));
    require(availableToSpend >= totalPrice, "msg.sender approved too little");

    // At this point, msg.sender has enough allowance to buy the tickets they want & they're actually buying tickets
    bool success = token.transferFrom(msg.sender, address(this), totalPrice);
    require(success, "error during transferFrom");
    emit Incoming(msg.sender, totalPrice);

    // We have payment.. everything else is book keeping on our side
    for (uint256 i = 0; i < ticketCount; i++) {
      tickets.push(msg.sender);
    }

    feeTotal += totalPrice / 20;
    prizeTotal += totalPrice - (totalPrice / 20);
  }

  function getTickets() public view returns (uint256) {
    uint256 count = 0;
    for (uint256 i = 0; i < tickets.length; i++) {
      if (tickets[i] == msg.sender) {
        count += 1;
      }
    }
    return count;
  }

  modifier onlyOwner() {
    require(msg.sender == ownerAddress, "msg.sender must be owner");
    _;
  }
  modifier onlyOwnerOrManager() {
    require(
      msg.sender == ownerAddress ||
        msg.sender == managerAddress[0] ||
        msg.sender == managerAddress[1],
      "msg.sender must be owner/manager"
    );
    _;
  }

  // Dumps entire feeTotal into recipient's address.
  // Only owner can call this function
  function ownerWithdrawTo(address recipient) public onlyOwner {
    bool success = token.transfer(recipient, feeTotal);
    require(success, "error during transfer");
    feeTotal = 0;
    emit Outgoing(recipient, feeTotal);
  }

  function setTicketPrice(uint256 targetTicketPrice) public onlyOwner {
    ticketPrice = targetTicketPrice;
  }

  function getTicketPrice() public view onlyOwner returns (uint256) {
    return ticketPrice;
  }

  function setManager(uint256 i, address to) public onlyOwner {
    require(i <= 1, "only two indexs for managers");
    managerAddress[i] = to;
  }

  function getManagers() public view onlyOwner returns (address[2] memory) {
    return managerAddress;
  }

  function draw() public onlyOwnerOrManager {
    require(tickets.length > 0, "no tickets");
    require(
      block.timestamp > lastDrawTime + 300,
      "need 5 minutes between draws"
    );

    address winner = tickets[random() % tickets.length];
    token.transfer(winner, prizeTotal);
    emit Outgoing(winner, prizeTotal);
    // Reset tickets, prize pool and draw time
    delete tickets;
    lastDrawTime = block.timestamp;
    prizeTotal = 0;
  }

  function random() private view returns (uint256) {
    return
      uint256(
        keccak256(abi.encodePacked(block.difficulty, block.timestamp, tickets))
      );
  }
}

// Inheriting from ERC20 gives us basic fungible token methods
// https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#core
contract MockToken is ERC20 {
  // Constructor is run once upon deploying SC... used to set intial state
  constructor() ERC20("MockToken", "MOK") {
    // In the constructor... msg.sender is the owner of smart contract
  }

  function mint(uint256 amount) public {
    _mint(msg.sender, amount);
  }
}
