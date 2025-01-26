using System.ComponentModel.DataAnnotations;

namespace RealTimeChat.Models;

public class Message
{
    [Key]
    public Guid Id { get; set; }
    
    public string ChatRoom { get; set; }
    
    public string UserName { get; set; }
    
    public string MessageText { get; set; }
    
    public DateTime SendedAt { get; set; }

    public Message(Guid id,
        string chatRoom,
        string userName,
        string messageText,
        DateTime sendedAt)
    {
        Id = id;
        ChatRoom = chatRoom;
        UserName = userName;
        MessageText = messageText;
        SendedAt = sendedAt;
    }
}