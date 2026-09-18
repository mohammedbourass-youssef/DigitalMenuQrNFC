namespace NFC_Backend.Domain.Entities
{
    public class MenuImage
    {
        public Guid Id { get; set; }
        public Guid MenuId { get; set; }
        public string Url { get; set; } = null!;

        public int DisplayOrder { get; set; }  // gallery ordering
        public DateTime CreatedAt { get; set; }

        public MenuItem Menu { get; set; } = null!;
    }
}
