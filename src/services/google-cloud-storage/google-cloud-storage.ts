const { Storage } = require("@google-cloud/storage");
// Creates a storage client
const storage = new Storage();

export class GoogleCloudStorage {
  uploadFile = async function (
    this: GoogleCloudStorage,
    filename: string,
    cloudStorageDir: string
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        let bucketName = process.env.GOOGLE_BUCKET_NAME;
        // Uploads a local file to the bucket
        await storage.bucket(bucketName).upload(filename, {
          destination: cloudStorageDir,
          // Support for HTTP requests made with `Accept-Encoding: gzip`
          gzip: true,
          // By setting the option `destination`, you can change the name of the
          // object you are uploading to a bucket.
          metadata: {
            // Enable long-lived HTTP caching headers
            // Use only if the contents of the file will never change
            // (If the contents will change, use cacheControl: 'no-cache')
            cacheControl: "public, max-age=31536000",
          },
        });

        const url = await this.getSignedURL(cloudStorageDir);
        resolve(url);
        console.log(`${filename} uploaded to ${bucketName}.`);
      } catch (e) {
        reject(e);
      }
    });
  };

  getSignedURL = function (
    this: GoogleCloudStorage,
    fileName: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let bucketName = process.env.GOOGLE_BUCKET_NAME;
      //Initialize file.
      const file = storage.bucket(bucketName).file(fileName);
      //Get a signed URL that expires in one day.
      return file
        .getSignedUrl({
          action: "read",
          expires: this.getExpiry(),
        })
        .then((signedUrls: string[]) => {
          resolve(signedUrls[0]);
        })
        .catch((e: any) => {
          console.error(e);
          reject(e);
        });
    });
  };

  deleteFilesWithPrefix = function (this: GoogleCloudStorage, filePrefix: string) {
    return new Promise((resolve, reject) => {
      let bucketName = process.env.GOOGLE_BUCKET_NAME;
      const bucket = storage.bucket(bucketName);

      return bucket.deleteFiles(
        {
          prefix: filePrefix,
        },
        function (err: any) {
          if (err) {
            console.error(`Error delete GCS files:`, err);
            reject(err);
          } else {
            console.log(
              `All the files with prefix ${filePrefix} have been deleted`
            );
            resolve(true);
          }
        }
      );
    });
  };

  getExpiry = function () {
    return new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  };
}
