using Microsoft.EntityFrameworkCore;
using OrmTrainer.Data;
using OrmTrainer.Models.Schedule;
using Z.EntityFramework.Plus;

namespace OrmTrainer.Repositories;

public class ScheduleRepository
{
    private readonly AppDbContext _context;
    
    public ScheduleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task Task34Async()
    {
        var count = await _context.SchoolClasses
            .Where(x => x.Name.StartsWith("10"))
            .CountAsync();
    }

    public async Task Task36Async()
    {
        var res = await _context.Students
            .Where(x => x.Address.StartsWith("ul. Pushkina"))
            .CountAsync();
    }

    public async Task Task35Async()
    {
        var targetDate = new DateOnly(2019, 9, 2);

        var count = await _context.Schedules
            .Where(x => x.Date == targetDate)
            .Select(x => x.Classroom)
            .Distinct()
            .CountAsync();
    }

    public async Task Task37Async()
    {
        var a = _context.Students
            .OrderBy(x => x.BirthDate)
            .Take(1)
            .Select(s => DateTime.Now.Year - s.BirthDate.Year -
                         ((DateTime.Now.Month < s.BirthDate.Month ||
                           (DateTime.Now.Month == s.BirthDate.Month && DateTime.Now.Day < s.BirthDate.Day))
                             ? 1
                             : 0))
            .First();
    }

    public async Task Task40Async()
    {
        var name = from teacher in _context.Teachers
            join s in _context.Schedules on teacher.Id equals s.TeacherId
            join sub in _context.Subjects on s.SubjectId equals sub.Id
            where teacher.LastName == "Romashkin"
                  && teacher.FirstName.Substring(1, 1) == "P"
                  && teacher.MiddleName.Substring(0, 1) == "P"
            select sub.Name;

        var res = name.ToList();
    }

    public async Task Tas42Async()
    {
        var time = _context.Timepairs
            .Where(x => x.Id >= 2 && x.Id <= 4)
            .GroupBy(x => 1)
            .Select(x => new
            {
                MaxEndPair = x.Max(tp => tp.EndTime),
                MinEndPair = x.Min(tp => tp.StartTime),
            })
            .Select(x => x.MaxEndPair - x.MinEndPair)
            .First();
    }

    public async Task Task43Async()
    {
        var lastName = _context.Teachers
            .Join(_context.Schedules,
                teacher => teacher.Id,
                schedule => schedule.TeacherId,
                (teacher, schedule) => new { teacher, schedule })
            .Join(_context.Subjects,
                scheduleWithTeacher => scheduleWithTeacher.schedule.SubjectId,
                subject => subject.Id,
                (scheduleWithTeacher, subject) => new { scheduleWithTeacher, subject })
            .Where(x => x.subject.Name == "Physical Culture")
            .OrderBy(x => x.scheduleWithTeacher.teacher.LastName)
            .Select(x => x.scheduleWithTeacher.teacher.LastName)
            .ToList();
    }

    // TODO: не логгирует sql запрос
    public async Task Task57Async()
    {
        var timeSpanToAdd = new TimeSpan(0, 30, 0);
        
        await _context.Timepairs
            .UpdateFromQueryAsync(tp => new Timepair
            {
                StartTime = tp.StartTime.Add(timeSpanToAdd),
                EndTime = tp.EndTime.Add(timeSpanToAdd)
            });
    }

    // TODO
    public async Task Task44Async()
    {
        var currentYear = DateTime.Now.Year;

        var maxYear = from student in _context.Students
            join studentInClass in _context.StudentInClasses on student.Id equals studentInClass.StudentId
            join klass in _context.SchoolClasses on studentInClass.ClassId equals klass.Id
            where klass.Name.StartsWith("10")
            select new
            {
                student.Id
            };
        
        


    }
}