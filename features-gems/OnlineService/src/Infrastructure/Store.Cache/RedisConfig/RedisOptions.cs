namespace Swipty.OnlineService.Store.Cache.RedisConfig;

public class RedisOptions
{
    public string Redis_Host { get; set; } = String.Empty;

    public string Redis_Port { get; set; } = String.Empty;

    public string Redis_User { get; set; } = String.Empty;

    public string Redis_Password { get; set; } = String.Empty;

    public string Redis_Database { get; set; } = String.Empty;

    public string GetConnectionString()
    {
        return $"{Redis_Host}:{Redis_Port},password={Redis_Password}";
    }


}
