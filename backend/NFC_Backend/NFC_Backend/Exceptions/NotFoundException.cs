namespace NFC_Backend.Exceptions
{
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message)
        { }
        
        public NotFoundException() 
        {
        }
    }
}