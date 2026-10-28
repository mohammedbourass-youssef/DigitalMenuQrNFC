namespace NFC_Backend.Domain.Entities
{
    public class PlanFeature
    {
        public int PlanId { get; set; }
        public Guid FeatureId { get; set; }

        public Plan Plan { get; set; } = default!;
        public Feature Feature { get; set; } = default!;
    }
}
