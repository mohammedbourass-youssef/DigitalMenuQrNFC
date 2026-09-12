using Minio;
using Minio.DataModel.Args;

namespace NFC_Backend.Services
{
    public class MinioFileStorageService : IFileStorageService
    {
        private readonly IMinioClient _minioClient;

        public MinioFileStorageService(IConfiguration configuration)
        {
            var endpoint = configuration["Minio:Endpoint"]
                ?? throw new InvalidOperationException("Minio:Endpoint not configured.");
            var accessKey = configuration["Minio:AccessKey"]
                ?? throw new InvalidOperationException("Minio:AccessKey not configured.");
            var secretKey = configuration["Minio:SecretKey"]
                ?? throw new InvalidOperationException("Minio:SecretKey not configured.");
            var useSsl = configuration.GetValue<bool>("Minio:UseSsl", false);

            _minioClient = new MinioClient()
                .WithEndpoint(endpoint)
                .WithCredentials(accessKey, secretKey)
                .WithSSL(useSsl)
                .Build();
        }

        public async Task CreateTenantBucketAsync(string bucketName)
        {
            var exists = await _minioClient.BucketExistsAsync(
                new BucketExistsArgs().WithBucket(bucketName));

            if (!exists)
            {
                await _minioClient.MakeBucketAsync(
                    new MakeBucketArgs().WithBucket(bucketName));

                // make it publicly readable — anyone with the URL can GET objects
                var policyJson = $$"""
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": { "AWS": ["*"] },
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::{{bucketName}}/*"]
                }
            ]
        }
        """;

                await _minioClient.SetPolicyAsync(new SetPolicyArgs()
                    .WithBucket(bucketName)
                    .WithPolicy(policyJson));
            }
        }

        public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string bucketName)
        {
            var objectKey = $"{Guid.NewGuid()}_{fileName}";

            await _minioClient.PutObjectAsync(new PutObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectKey)
                .WithStreamData(fileStream)
                .WithObjectSize(fileStream.Length)
                .WithContentType(contentType));

            return objectKey;
        }

        public async Task DeleteFileAsync(string objectKey, string bucketName)
        {
            await _minioClient.RemoveObjectAsync(new RemoveObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectKey));
        }

        public async Task<string> GetFileUrlAsync(string objectKey, string bucketName, int expiryInSeconds = 3600)
        {
            return await _minioClient.PresignedGetObjectAsync(new PresignedGetObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectKey)
                .WithExpiry(expiryInSeconds));
        }
    }
}