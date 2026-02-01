using Microsoft.EntityFrameworkCore;
using OrmTrainer.Data;
using OrmTrainer.Models.Schedule;
using Z.EntityFramework.Plus;

namespace OrmTrainer.Repositories;

// 38, 39 - простые

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

    public async Task Task42Async()
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

    public async Task Task57Async()
    {
        var timeSpanToAdd = new TimeSpan(0, 30, 0);

        await _context.Timepairs
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.StartTime, x => x.StartTime + timeSpanToAdd)
                .SetProperty(x => x.EndTime, x => x.EndTime  +timeSpanToAdd));
    }

    public async Task Task44Async()
    {
        var currentYear = DateTime.Now.Year;

        var maxYear = _context.StudentInClasses
            .Join(_context.Students, sc => sc.StudentId, s => s.Id, (sc, s) => new { sc, s })
            .Join(_context.SchoolClasses, scs => scs.sc.ClassId, c => c.Id, (scs, c) => new { scs, c })
            .Where(scsc => scsc.c.Name.StartsWith("10"))
            .Select(scsc => DateTime.Now.Year - scsc.scs.s.BirthDate.Year)
            .Max();
    }

    public async Task Task45Async()
    {
        var subQuery = _context.Schedules
            .GroupBy(x => x.Classroom)
            .Select(x => x.Count())
            .OrderByDescending(x => x);


        var classrooms = _context.Schedules
            .GroupBy(x => x.Classroom)
            .Where(x => x.Count() == subQuery.First())
            .Select(x => x.Key)
            .ToList();
    }

    public async Task Task60Async()
    {
        var query = from sc in _context.Schedules
            join cl in _context.SchoolClasses on sc.ClassId equals cl.Id
            where cl.Name.StartsWith("11")
            group new { sc, cl } by sc.TeacherId
            into g
            where g.Select(x => x.cl.Name).Distinct().Count() == 2
            select g.Key;

        var res = query.ToList();
    }

    public async Task Task77Async()
    {
        // without view
        // var res = _context.Teachers
        //     .Select(x => new
        //     {
        //         x.FirstName,
        //         x.LastName
        //     })
        //     .Union(_context.Students
        //         .Select(x => new
        //         {
        //             x.FirstName,
        //             x.LastName
        //         }))
        //     .ToList();

        // with view
        var res = _context.PeopleViews.ToList();
    }
    
    public async Task Task63Async()
    {
        var res = await _context.Students
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .Select(x => x.LastName + " " + x.FirstName.Substring(0, 1))
            .ToListAsync();
    }

    public async Task Task50Async()
    {
        var query = from sc in _context.StudentInClasses
            join st in _context.Students on sc.ClassId equals st.Id
            where st.BirthDate.Year == 2000
            group new { sc, st } by 1
            into g
            select
                Math.Floor((double)(g.Select(x => x.st).Count() / g.Select(x => x.sc).Count() * 100));

        var res = query.ToList();
    }

    public async Task Task49Async()
    {
        var allQuery = from sc in _context.StudentInClasses
            select sc;

        var class10CountQuery = from sc in _context.StudentInClasses
            join cl in _context.SchoolClasses on sc.ClassId equals cl.Id
            where cl.Name == "10 A"
            select sc;

        var query = from sc in _context.StudentInClasses
            select class10CountQuery.Count() / allQuery.Count();


        var res = query.FirstOrDefault();
    }

    public async Task Task48Async()
    {
        var query = from cl in _context.SchoolClasses
            join sc in _context.StudentInClasses on cl.Id equals sc.ClassId
            group new { cl, sc } by new { cl.Id, cl.Name }
            into g
            orderby g.Select(x => x.sc.Id).Count()
            select new
            {
                Name = g.Key.Name,
                Count = g.Select(x => x.sc.Id).Count()
            };
        var res = query.ToList();
    }

    public async Task Task47Async()
    {
        var targetDate = new DateOnly(2019, 8, 30);

        var query = from sc in _context.Schedules
            join t in _context.Teachers on sc.TeacherId equals t.Id
            where t.LastName == "Krauze"
                  && sc.Date == targetDate
            select sc;
        
        var res = query.Count();
    }

    public async Task Task46Async()
    {
        var query = from sc in _context.Schedules
            join cl in _context.SchoolClasses on sc.ClassId equals cl.Id
            join t in _context.Teachers on sc.TeacherId equals t.Id
            where t.LastName == "Krauze"
            select cl.Name;
        
        var res = query.Distinct().ToList();
    }

    public async Task Task75Async()
    {
        var query = _context.Students
            .Where(x => x.BirthDate.Month == 5)
            .Select(x => new
            {
                LastName = x.LastName,
                FirstName = x.FirstName,
                BirthDate = x.BirthDate,
            })
            .ToList();
    }

    public async Task Task41Async()
    {
        var res = await _context.Timepairs
            .Where(x => x.Id == 4)
            .Select(x => x.StartTime)
            .FirstAsync();
    }
}