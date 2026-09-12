namespace NFC_Backend.Services
{
    public interface IFileStorageService
    {
        Task CreateTenantBucketAsync(string bucketName);
        Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string bucketName);
        Task DeleteFileAsync(string objectKey, string bucketName);
        Task<string> GetFileUrlAsync(string objectKey, string bucketName, int expiryInSeconds = 3600);
    }
}