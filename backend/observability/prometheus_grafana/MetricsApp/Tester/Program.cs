using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        using (HttpClient client = new HttpClient())
        {
            client.BaseAddress = new Uri("http://localhost:5097");

            while (true)
            {
                try
                {
                    // Отправляем GET-запрос
                    HttpResponseMessage response = await client.GetAsync("/test");
                    response.EnsureSuccessStatusCode();
                    string responseBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine(responseBody);

                    // Отправляем POST-запрос
                    string jsonContent = "{\"data\":\"test data\"}";
                    HttpContent content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");
                    response = await client.PostAsync("/test", content);
                    response.EnsureSuccessStatusCode();
                    responseBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine(responseBody);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error: {ex.Message}");
                }

                // Задержка перед следующим запросом
                await Task.Delay(1000); // 1 секунда
            }
        }
    }
}