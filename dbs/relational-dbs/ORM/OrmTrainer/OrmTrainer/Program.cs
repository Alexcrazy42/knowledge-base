
using OrmTrainer.Data;
using OrmTrainer.Repositories;

using var dbContext = new AppDbContext();
var airTravelRepository = new AirTravelRepository(dbContext);
var scheduleRepository = new ScheduleRepository(dbContext);

await ScheduleHandle();

async Task ScheduleHandle()
{
    // await scheduleRepository.Task34Async();

    // await scheduleRepository.Task36Async();

    // await scheduleRepository.Task35Async();

    // await scheduleRepository.Task37Async();

    // await scheduleRepository.Task40Async();
    
    // await scheduleRepository.Tas42Async();

    // await scheduleRepository.Task43Async();

    await scheduleRepository.Task57Async();
}

async Task AirTravelHandle()
{
    //await airTravelRepository.Task1Async();

    //await airTravelRepository.Task3Async();

    // await airTravelRepository.Task4Async();

    // await airTravelRepository.Task5Async();

    // await airTravelRepository.Task6Async();

    // await airTravelRepository.Task7Async();

    // await airTravelRepository.Task8Async();

    // await airTravelRepository.Task9Async();

    // await airTravelRepository.Task10Async();

    // await airTravelRepository.Task11Async();

    // await airTravelRepository.Task12Async();

    // await airTravelRepository.Task13Async();

    // await airTravelRepository.Task14Async();

    // await airTravelRepository.Task15Async();

    // await airTravelRepository.Task16Async();

    // await airTravelRepository.Task28Async();

    // await airTravelRepository.Task29Async();

    // await airTravelRepository.Task30Async();

    // await airTravelRepository.Task55Async();

    await airTravelRepository.Task56Async();
}