export enum UserPermission {
  EDIT_USER_TERMS = 'edit_user_terms',
  EDIT_FEES = 'edit_fees',
}

// `Object.values` works here only because UserPermission values are strings.
// This technique wouldn't work for enums that have numeric values.
// https://github.com/Microsoft/TypeScript/issues/17198#issuecomment-315400819
export const ALL_USER_PERMISSION_VALUES = Object.values(UserPermission);
