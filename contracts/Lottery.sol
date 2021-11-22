//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// https://docs.openzeppelin.com/contracts/2.x/access-control

contract Lottery {
  address private ownerAddress;
  address[2] private managerAddresses;

  address[] private tickets;
  uint256 private ticketPrice;
  uint256 private feeTotal;
  uint256 private prizeTotal;
  uint256 private lastDrawTime;

  event Incoming(address, uint256);
  event Outgoing(address, uint256);

  // https://ethereum.org/en/developers/tutorials/transfers-and-approval-of-erc-20-tokens-from-a-solidity-smart-contract/
  IERC20 public token;

  // cast the interface.

  // Constructor is run once upon deploying SC... used to set intial state
  constructor(IERC20 mockTokenAddress) {
    token = mockTokenAddress;

    // msg.sender is the address that deployed Sc
    ownerAddress = msg.sender;
    ticketPrice = 20;
    lastDrawTime = block.timestamp - (60 * 5);
  }

  modifier onlyOwner() {
    require(msg.sender == ownerAddress, "msg.sender must be owner");
    _;
  }
  modifier onlyOwnerOrManager() {
    require(
      msg.sender == ownerAddress ||
        msg.sender == managerAddresses[0] ||
        msg.sender == managerAddresses[1],
      "msg.sender must be owner/manager"
    );
    _;
  }

  // Dumps entire feeTotal into recipient's address.
  // Only owner can call this function
  function ownerWithdraw(address recipient) public onlyOwner {
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

  function setManager(uint256 i, address managerAddress) public onlyOwner {
    require(i == 0 || i == 1, "only two indexs for managers");
    managerAddresses[i] = managerAddress;
  }

  function getManagers() public view onlyOwner returns (address[2] memory) {
    return managerAddresses;
  }

  function buyTickets(uint256 ticketCount) public {
    require(ticketCount != 0, "zero ticketCount");

    uint256 totalPrice = ticketCount * ticketPrice;

    // At this point, msg.sender has enough allowance to buy the tickets they want & they're actually buying tickets
    bool success = token.transferFrom(msg.sender, address(this), totalPrice);
    require(success, "error during transferFrom");
    emit Incoming(msg.sender, totalPrice);

    // We have payment, everything else is book keeping on our side
    for (uint256 i = 0; i < ticketCount; i++) {
      tickets.push(msg.sender);
    }
    uint256 feeBasisPoints = 500;
    uint256 fee = (totalPrice * feeBasisPoints) / 10000;
    prizeTotal += totalPrice - fee;
    feeTotal += fee;
  }

  // Returns number of tickets held by an individual
  function getTickets() public view returns (uint256) {
    uint256 count = 0;
    for (uint256 i = 0; i < tickets.length; i++) {
      if (tickets[i] == msg.sender) {
        count += 1;
      }
    }
    return count;
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
