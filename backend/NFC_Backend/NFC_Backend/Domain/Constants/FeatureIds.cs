namespace NFC_Backend.Domain.Constants
{
    /// <summary>
    /// Permanent feature identifiers shared with the frontend catalog.
    /// Never renumber, reuse, or rename these values.
    /// </summary>
    public static class FeatureIds
    {
        public static readonly Guid Menu = Guid.Parse("a1000000-0000-0000-0000-000000000001");
        public static readonly Guid Categories = Guid.Parse("a1000000-0000-0000-0000-000000000002");
        public static readonly Guid Tables = Guid.Parse("a1000000-0000-0000-0000-000000000003");
        public static readonly Guid Orders = Guid.Parse("a1000000-0000-0000-0000-000000000004");
        public static readonly Guid Invoices = Guid.Parse("a1000000-0000-0000-0000-000000000005");
        public static readonly Guid Users = Guid.Parse("a1000000-0000-0000-0000-000000000006");
        public static readonly Guid Roles = Guid.Parse("a1000000-0000-0000-0000-000000000007");
        public static readonly Guid AiAgent = Guid.Parse("a1000000-0000-0000-0000-000000000008");
        public static readonly Guid DataAnalyst = Guid.Parse("a1000000-0000-0000-0000-000000000009");
        public static readonly Guid Chatbot = Guid.Parse("a1000000-0000-0000-0000-00000000000a");

        public static readonly Guid Notifications = Guid.Parse("a1000000-0000-0000-0000-00000000000b");
        public static readonly Guid PaymentMethods = Guid.Parse("a1000000-0000-0000-0000-00000000000c");
        public static readonly Guid PaymentStatuses = Guid.Parse("a1000000-0000-0000-0000-00000000000d");
        public static readonly Guid NfcTags = Guid.Parse("a1000000-0000-0000-0000-00000000000e");
        public static readonly Guid Settings = Guid.Parse("a1000000-0000-0000-0000-00000000000f");
        public static readonly Guid Subscription = Guid.Parse("a1000000-0000-0000-0000-000000000010");
        public static readonly Guid Employees = Guid.Parse("a1000000-0000-0000-0000-000000000011");
        public static readonly Guid Departments = Guid.Parse("a1000000-0000-0000-0000-000000000012");
        public static readonly Guid JobTitles = Guid.Parse("a1000000-0000-0000-0000-000000000013");
        public static readonly Guid LeaveManagement = Guid.Parse("a1000000-0000-0000-0000-000000000014");
        public static readonly Guid Attendance = Guid.Parse("a1000000-0000-0000-0000-000000000015");
        public static readonly Guid Payroll = Guid.Parse("a1000000-0000-0000-0000-000000000016");
        public static readonly Guid AuditLog = Guid.Parse("a1000000-0000-0000-0000-000000000017");
        public static readonly Guid HRGeneralSettings = Guid.Parse("a1000000-0000-0000-0000-000000000018");
    }

    /// <summary>
    /// Stable feature codes. Must match the frontend catalog character for character.
    /// </summary>
    public static class FeatureCodes
    {
        public const string Menu = "Menu";
        public const string Categories = "Categories";
        public const string Tables = "Tables";
        public const string Orders = "Orders";
        public const string Invoices = "Invoices";
        public const string Users = "Users";
        public const string Roles = "Roles";
        public const string AiAgent = "AiAgent";
        public const string DataAnalyst = "DataAnalyst";
        public const string Chatbot = "Chatbot";

        public const string Notifications = "Notifications";
        public const string PaymentMethods = "PaymentMethods";
        public const string PaymentStatuses = "PaymentStatuses";
        public const string NfcTags = "NfcTags";
        public const string Settings = "Settings";
        public const string Subscription = "Subscription";
        public const string Employees = "Employees";
        public const string Departments = "Departments";
        public const string JobTitles = "JobTitles";
        public const string LeaveManagement = "LeaveManagement";
        public const string Attendance = "Attendance";
        public const string Payroll = "Payroll";
        public const string AuditLog = "AuditLog";
        public const string HRGeneralSettings = "HRGeneralSettings";
    }
}
