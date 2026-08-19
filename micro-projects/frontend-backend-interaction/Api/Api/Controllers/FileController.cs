using System.Net.Http.Headers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FileController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    
    public FileController(IWebHostEnvironment env)
    {
        _env = env;
    }
    
    [HttpGet("image-small")]
    public IActionResult GetSmallImage()
    {
        var imageBytes = System.IO.File.ReadAllBytes("Files/cats.jpg");
        
        Response.Headers.Append("Content-Disposition", "inline");
        return File(imageBytes, "image/jpg");
    }

    [HttpGet("image-small-with-name")]
    public IActionResult GetSmallImageWithName()
    {
        if (!System.IO.File.Exists("Files/cats.jpg"))
        {
            return NotFound();
        }
        
        var imageBytes = System.IO.File.ReadAllBytes("Files/cats.jpg");
        
        
        // добавиn Content-Disposition с содержимым ответа: attachment
        return File(imageBytes, "image/jpeg", "Files/cats.jpg");
    }

    [HttpGet("watermark")]
    public async Task<IActionResult> AddWatermark(string text = "SAMPLE")
    {
        using var image = await Image.LoadAsync("Files/cats.jpg");
        
        var font = SystemFonts.CreateFont("Arial", 48, FontStyle.Bold);
        
        var position = new PointF(
            image.Width - 300,
            image.Height - 80
        );
        
        image.Mutate(ctx => ctx.DrawText(
            text,
            font,
            Color.White.WithAlpha(0.7f),
            position
        ));
        
        using var ms = new MemoryStream();
        await image.SaveAsync(ms, new JpegEncoder());
    
        Response.Headers.Append("Content-Disposition", "inline");
        return File(ms.ToArray(), "image/jpeg");
    }
    
    [HttpGet("video-stream")]
    public IActionResult VideoStreamVideo()
    {
        var filePath = Path.Combine(_env.ContentRootPath, "Files", "cats.mp4");
        
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound();
        }
        
        return PhysicalFile(
            filePath,
            "video/mp4",
            enableRangeProcessing: true
        );
    }
    
    // без PhysicalFile
    [HttpGet("video-stream-manual")]
    public async Task<IActionResult> VideoStreamManual()
    {
        var filePath = Path.Combine(_env.ContentRootPath, "Files", "cats.mp4");

        if (!System.IO.File.Exists(filePath))
        {
            return NotFound();
        }

        var fileInfo = new FileInfo(filePath);
        var fileLength = fileInfo.Length;
        var contentType = "video/mp4";
        var response = Response;
        
        response.Headers["Accept-Ranges"] = "bytes";
        response.ContentType = contentType;

        var rangeHeader = Request.Headers.Range.ToString();

        if (!string.IsNullOrEmpty(rangeHeader) && 
            RangeHeaderValue.TryParse(rangeHeader, out var parsedRange))
        {
            // === Обработка частичного запроса (206 Partial Content) ===
            
            var range = parsedRange.Ranges.First();
            var start = range.From ?? 0;
            var end = range.To ?? fileLength - 1;

            // Валидация диапазона
            if (start >= fileLength || start > end)
            {
                response.StatusCode = StatusCodes.Status416RangeNotSatisfiable;
                response.Headers["Content-Range"] = $"bytes */{fileLength}";
                return new EmptyResult();
            }

            // Корректируем end, если он выходит за границы файла
            if (end >= fileLength)
            {
                end = fileLength - 1;
            }

            var contentLength = end - start + 1;

            response.StatusCode = StatusCodes.Status206PartialContent;
            response.Headers["Content-Range"] = $"bytes {start}-{end}/{fileLength}";
            response.ContentLength = contentLength;

            // Открываем файл и читаем только запрошенный диапазон
            await using var fileStream = new FileStream(
                filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            
            fileStream.Seek(start, SeekOrigin.Begin);

            var buffer = new byte[81920]; // 80 KB буфер
            long remaining = contentLength;

            while (remaining > 0)
            {
                var toRead = (int)Math.Min(buffer.Length, remaining);
                var bytesRead = await fileStream.ReadAsync(buffer.AsMemory(0, toRead));

                if (bytesRead == 0) break;

                await response.Body.WriteAsync(buffer.AsMemory(0, bytesRead));
                remaining -= bytesRead;
            }
        }
        else
        {
            response.StatusCode = StatusCodes.Status200OK;
            response.ContentLength = fileLength;

            await using var fileStream = new FileStream(
                filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

            await fileStream.CopyToAsync(response.Body);
        }
        
        return new EmptyResult();
    }
}