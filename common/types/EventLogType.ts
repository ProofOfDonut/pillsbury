export enum EventLogType {
  DEBUG = 'debug',
  API_ENDPOINT = 'api_endpoint',
  API_ENDPOINT_ERROR = 'api_endpoint_error',
  ETHEREUM_SEND_TRANSACTION = 'ethereum_send_transaction',
  ETHEREUM_SEND_TRANSACTION_ERROR = 'ethereum_send_transaction_error',
  REDDIT_MESSAGE_RECEIVED = 'reddit_message_received',
  REDDIT_PUPPET_ENDPOINT = 'reddit_puppet_endpoint',
  REDDIT_PUPPET_ENDPOINT_ERROR = 'reddit_puppet_endpoint_error',
  REDDIT_WITHDRAWAL_CONFIRMATION_ERROR = 'reddit_withdrawal_confirmation_error',
  WITHDRAWAL_ERROR = 'withdrawal_error',
  WITHDRAWAL_REFUND_ERROR = 'withdrawal_refund_error',
  SIGN_WITHDRAWAL = 'sign_withdrawal',
  WITHDRAWAL_SIGNED = 'withdrawal_signed',
  BALANCE_OK = 'balance_ok',
  BALANCE_MISMATCH = 'balance_mismatch',
}

