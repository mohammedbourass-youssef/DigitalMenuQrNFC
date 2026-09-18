namespace NFC_Backend.Domain.Entities
{
    public class MenuItemTranslation
    {
        public Guid Id { get; set; }
        public string Lang { get; set; } = null!;   // matches CategoryTranslation.Lang convention
        public Guid MenuId { get; set; }
        public string Name { get; set; } = null!;
        public string? Descriptions { get; set; }

        public MenuItem Menu { get; set; } = null!;
    }
}
