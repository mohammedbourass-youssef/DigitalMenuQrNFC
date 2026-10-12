using Minio;
using Minio.DataModel.Args;

namespace NFC_Backend.Services
{
    public class MinioFileStorageService : IFileStorageService
    {
        private readonly IMinioClient _minioClient;
        private readonly string _endpoint;
        private readonly bool _useSsl;
        private readonly string _fileAPI;
        private readonly ILogger<MinioFileStorageService> _logger;

        public MinioFileStorageService(IConfiguration configuration , ILogger<MinioFileStorageService> logger)
        {
            _logger = logger;
             _endpoint = configuration["Minio:Endpoint"]
                ?? throw new InvalidOperationException("Minio:Endpoint not configured.");
            _fileAPI = configuration["Minio:FileAPI"]
              ?? throw new InvalidOperationException("Minio:Endpoint not configured.");
            var accessKey = configuration["Minio:AccessKey"]
                ?? throw new InvalidOperationException("Minio:AccessKey not configured.");
            var secretKey = configuration["Minio:SecretKey"]
                ?? throw new InvalidOperationException("Minio:SecretKey not configured.");
             _useSsl = configuration.GetValue<bool>("Minio:UseSsl", false);
             _logger.LogInformation("MinioFileStorageService initialized with endpoint: {Endpoint}, useSsl: {UseSsl}", _endpoint, _useSsl);
            _minioClient = new MinioClient()
                .WithEndpoint(_endpoint)
                .WithCredentials(accessKey, secretKey) 
                .WithSSL(_useSsl)
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

        public Task<string> GetFileUrlAsync(string objectKey, string bucketName, int expiryInSeconds = 3600)
        {
            var scheme = _useSsl ? "https" : "http";
            var url = $"{scheme}://{_fileAPI}/{bucketName}/{objectKey}";
            _logger.LogInformation("Generated file URL: {Url} for bucket: {BucketName}, objectKey: {ObjectKey}", url, bucketName, objectKey);
            return Task.FromResult(url);
        }
    }
}