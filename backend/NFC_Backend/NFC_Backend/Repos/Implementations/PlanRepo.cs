using NFC_Backend.Infrastructure.Data;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Repos.Implementations
{
    public class PlanRepo : IPlanRepo
    {
        private readonly AppDbContext _db;

        public PlanRepo(AppDbContext db)
        {
            _db = db;
        }


    }
}
