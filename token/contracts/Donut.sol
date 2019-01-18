pragma solidity 0.4.25;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol';

contract Donut is ERC20, ERC20Detailed, ERC20Mintable, ERC20Pausable {
  using SafeMath for uint256;

  event Deposit(
      address from,
      address indexed accountId,
      uint256 value);

  constructor()
      ERC20Mintable()
      ERC20Pausable()
      ERC20Detailed('Donut', 'DONUT', 18)
      ERC20()
      public {}

  function deposit(
      address accountId,
      uint256 value)
      public
      whenNotPaused
      returns (bool) {
    // Require deposits to be in whole number amounts.
    require(value.mod(1e18) == 0);
    _burn(msg.sender, value);
    emit Deposit(msg.sender, accountId, value);
    return true;
  }

  function depositFrom(
      address accountId,
      address from,
      uint256 value)
      public
      whenNotPaused
      returns (bool) {
    // Require deposits to be in whole number amounts.
    require(value.mod(1e18) == 0);
    _burnFrom(from, value);
    emit Deposit(from, accountId, value);
    return true;
  }
}
