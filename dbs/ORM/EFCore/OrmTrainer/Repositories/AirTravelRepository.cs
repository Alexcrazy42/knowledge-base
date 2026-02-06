using Microsoft.EntityFrameworkCore;
using OrmTrainer.Data;

namespace OrmTrainer.Repositories;

// 56, 67

public class AirTravelRepository
{
    private readonly AppDbContext _context;

    public AirTravelRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task Task1Async()
    {
        var names = await _context.Passengers
            .Select(p => p.Name)
            .ToListAsync();
    }

    public async Task Task3Async()
    {
        var trips = await _context.Trips
            .Where(x => x.TownFrom == "Moscow")
            .ToListAsync();
    }

    public async Task Task4Async()
    {
        var passengers = await _context.Passengers
            .Where(x => x.Name.EndsWith("man"))
            .ToListAsync();
    }

    public async Task Task5Async()
    {
        var count = await _context.Trips
            .Where(x => x.Plane == "TU-134")
            .CountAsync();
    }

    public async Task Task6Async()
    {
        var companyNames = await _context.Trips
            .Where(t => t.Plane == "Boeing")
            .Select(t => t.Company.Name)
            .Distinct()
            .ToListAsync();
    }

    public async Task Task7Async()
    {
        var planes = await _context.Trips
            .Where(x => x.TownTo == "Moscow")
            .Select(x => x.Plane)
            .Distinct()
            .ToListAsync();
    }

    public async Task Task8Async()
    {
        var towns = await _context.Trips
            .Where(x => x.TownFrom == "Paris")
            .Select(x => new TownDto()
            {
                TownTo = x.TownTo,
                Duration = x.TimeIn - x.TimeOut
            })
            .ToListAsync();
    }

    public async Task Task9Async()
    {
        var names = from company in _context.Companies
            join trip in _context.Trips on company.Id equals trip.CompanyId
            where trip.TownFrom == "Vladivostok"
            select company.Name;

        await names.ToListAsync();
    }

    public async Task Task10Async()
    {
        var targetDate = new DateTimeOffset(new DateTime(1900, 1, 1));
        var startTime = new TimeSpan(10, 0, 0);
        var endTime = new TimeSpan(14, 0, 0);

        var trips = await _context.Trips
            .Where(t => t.TimeOut.Date == targetDate.Date &&
                        t.TimeOut.TimeOfDay >= startTime &&
                        t.TimeOut.TimeOfDay <= endTime)
            .ToListAsync();
    }

    public async Task Task11Async()
    {
        var passengersWithMaxNameLength = _context.Passengers
            .Where(p => p.Name.Length == _context.Passengers.Max(p2 => p2.Name.Length))
            .Select(p => p.Name)
            .ToList();
    }

    public async Task Task12Async()
    {
        var query = from trip in _context.Trips
            join passInTrip in _context.PassengerInTrips
                on trip.Id equals passInTrip.TripId into tripGroup
            from passInTrip in tripGroup.DefaultIfEmpty()
            group passInTrip by trip.Id
            into grouped
            select new
            {
                TripId = grouped.Key,
                Count = grouped.Count(p => p != null)
            };

        var result = query.ToList();
    }

    public async Task Task13Async()
    {
        var query = _context.Passengers
            .GroupBy(p => p.Name)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key);

        var result = query.ToList();
    }

    public async Task Task14Async()
    {
        var query = from pt in _context.PassengerInTrips
            join t in _context.Trips on pt.TripId equals t.Id
            where _context.Passengers
                .Where(p => p.Name == "Bruce Willis")
                .Select(p => p.Id).Contains(pt.PassengerId)
            select t.TownFrom;
        
        var result = await query.ToListAsync();
    }

    public async Task Task15Async()
    {
        var query = from t in _context.Trips
            join pt in _context.PassengerInTrips on t.Id equals pt.TripId
            where _context.Passengers.Where(x => x.Name == "Steve Martin").Select(x => x.Id)
                      .Contains(pt.PassengerId)
                  && t.TownTo == "London"
            select t.TimeIn;
        
        var result = query.ToList();
    }

    public async Task Task16Async()
    {
        var query = from pt in _context.PassengerInTrips
            join p in _context.Passengers on pt.PassengerId equals p.Id
            group pt by new { pt.PassengerId, p.Name } into g
            where g.Count() > 0
            orderby g.Count() descending, g.Key.Name ascending
            select new
            {
                Name = g.Key.Name,
                Count = g.Count()
            };

        
        var result = query.ToList();
    }

    public async Task Task28Async()
    {
        var query = await _context.Trips
            .Where(x => x.TownFrom == "Rostov" && x.TownTo == "Moscow")
            .CountAsync();
    }

    public async Task Task29Async()
    {
        var query = from t in _context.Trips
            join pt in _context.PassengerInTrips on t.Id equals pt.TripId
            join p in _context.Passengers on pt.PassengerId equals p.Id
            where t.TownTo == "Moscow" && t.Plane == "TU-134"
            select p.Name;
        
        var result = query.Distinct().ToList();
    }

    public async Task Task30Async()
    {
        var query = from t in _context.Trips
            join pt in _context.PassengerInTrips on t.Id equals pt.TripId
            group t by t.Id into g
            orderby g.Count() descending
            select new
            {
                TripId = g.Key,
                Count = g.Count()
            };
        
        var result = query.ToList();
    }

    public async Task Task55Async()
    {
        var subQuery = _context.Trips
            .GroupBy(t => t.CompanyId)
            .Select(g => new { Count = g.Count() })
            .OrderBy(g => g.Count)
            .Select(g => g.Count)
            .Take(1);


        var query = from t in _context.Trips
            group t by t.CompanyId into g
            where g.Count() == subQuery.First()
            select g.Key;

        var companiesToDelete = _context.Companies
            .Where(c => query.Contains(c.Id));

        companiesToDelete.ExecuteDelete();
    }

    public async Task Task56Async()
    {
        var tripsToDelete = _context.Trips
            .Where(x => x.TownFrom == "Moscow");
        
        tripsToDelete.ExecuteDelete();
    }
}

public class TownDto
{
    public string TownTo { get; set; }
    public TimeSpan Duration { get; set; }
}