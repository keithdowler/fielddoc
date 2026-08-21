import {
  AccountDeletionError,
  deleteFieldDocAccount,
} from "./account-deletion";

export async function DELETE(request: Request) {
  try {
    await deleteFieldDocAccount(request);
    return Response.json({ status: "deleted" });
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "ACCOUNT_DELETION_FAILED",
          message:
            "FieldDoc could not delete the account. Please contact support.",
        },
      },
      { status: 500 },
    );
  }
}
