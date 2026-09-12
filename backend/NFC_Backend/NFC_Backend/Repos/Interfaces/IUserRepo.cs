using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Repos.Interfaces
{
    public interface IUserRepo
    {
        public  Task<User> CreateUser(CreateUserDTO createUser);
        public Task<User?> GetUserByEmail(string Email);

    }
}
