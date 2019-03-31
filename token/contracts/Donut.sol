pragma solidity 0.5.6;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol';

contract Donut is ERC20, ERC20Detailed, ERC20Mintable, ERC20Pausable {
  using SafeMath for uint256;

  mapping (address => bool) _usedWithdrawalNonces;

  event Deposit(
      address from,
      address depositId,
      uint256 value);

  event Withdraw(
      address to,
      uint256 value);

  constructor()
      ERC20Mintable()
      ERC20Pausable()
      ERC20Detailed('Donut', 'DONUT', 18)
      ERC20()
      public {}

  function deposit(
      address depositId,
      uint256 value)
      public
      whenNotPaused
      returns (bool) {
    // Require deposits to be in whole number amounts.
    require(value.mod(1e18) == 0);
    _burn(msg.sender, value);
    emit Deposit(msg.sender, depositId, value);
    return true;
  }

  function depositFrom(
      address depositId,
      address from,
      uint256 value)
      public
      whenNotPaused
      returns (bool) {
    // Require deposits to be in whole number amounts.
    require(value.mod(1e18) == 0);
    _burnFrom(from, value);
    emit Deposit(from, depositId, value);
    return true;
  }

  function withdraw(
      uint8 v,
      bytes32 r,
      bytes32 s,
      address nonce,
      uint256 value)
      public
      whenNotPaused
      returns (bool) {
    return withdrawTo(v, r, s, nonce, msg.sender, value);
  }

  function withdrawTo(
      uint8 v,
      bytes32 r,
      bytes32 s,
      address nonce,
      address to,
      uint256 value)
      public
      whenNotPaused
      returns (bool) {
    require(!_usedWithdrawalNonces[nonce]);
    _usedWithdrawalNonces[nonce] = true;
    bytes32 message = getWithdrawalMessage(nonce, value);
    address signer = ecrecover(message, v, r, s);
    require(signer != address(0));
    require(isMinter(signer));
    _mint(to, value);
    emit Withdraw(to, value);
    return true;
  }

  function getWithdrawalMessage(
      address nonce,
      uint256 value)
      public
      pure
      returns (bytes32) {
    bytes memory prefix = '\x1aPillsbury Signed Message:\n';
    return keccak256(abi.encodePacked(prefix, nonce, value));
  }
}
