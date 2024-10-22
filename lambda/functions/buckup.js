import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  CreateBackupCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";

const dynamoDBClient = new DynamoDBClient({});

export const handler = async (event) => {
  const tableName = process.env.TABLE_NAME;

  try {
    const describeTableOutput = await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }));
    const tableArn = describeTableOutput.Table?.TableArn;

    // Create a timestamp for the backup name.
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:-]/g, "");

    // Create the backup name.
    const backupName = `${tableName}-${timestamp}`;

    const createBackupCommand = new CreateBackupCommand({
      TableName: tableName,
      BackupName: backupName,
    });
    await dynamoDBClient.send(createBackupCommand);

    console.log(
      `Created backup ${backupName} for table ${tableName} with ARN ${tableArn}`
    );
  } catch (error) {
    console.error(`Error creating backup for table ${tableName}:`, error);
    throw error; // Rethrow the error to fail the Lambda function
  }
};