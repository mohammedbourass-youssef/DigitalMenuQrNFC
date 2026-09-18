using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class MenuItem : IMenuItem
    {
        private readonly AppDbContext _db;
        public MenuItem(AppDbContext appDb) { _db = appDb; }
    }
}
