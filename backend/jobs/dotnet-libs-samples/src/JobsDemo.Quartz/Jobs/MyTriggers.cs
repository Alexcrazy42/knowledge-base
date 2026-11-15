using Npgsql;
using Quartz;
using Quartz.Extensibility;
using Quartz.Impl.AdoJobStore;
using Quartz.Impl.Calendar;

namespace JobsDemo.Quartz.Jobs;

public class MyTrigger : ITrigger
{
    public TriggerKey Key => throw new NotImplementedException();

    public JobKey JobKey => throw new NotImplementedException();

    public string? Description => throw new NotImplementedException();

    public string? ExecutionGroup => throw new NotImplementedException();

    public PreferredNode PreferredNode => PreferredNode.Auto;

    public RetryPolicy? RetryPolicy => throw new NotImplementedException();

    public int RetryAttempt => throw new NotImplementedException();

    public string? CalendarName => throw new NotImplementedException();

    public JobDataMap JobDataMap => throw new NotImplementedException();

    public DateTimeOffset? FinalFireTimeUtc => throw new NotImplementedException();

    public int MisfireInstructionCode => throw new NotImplementedException();

    public DateTimeOffset? EndTimeUtc => throw new NotImplementedException();

    public DateTimeOffset StartTimeUtc => throw new NotImplementedException();

    public int Priority => throw new NotImplementedException();

    public bool MayFireAgain => throw new NotImplementedException();

    public DateTimeOffset? NextFireTimeUtc => throw new NotImplementedException();

    public DateTimeOffset? PreviousFireTimeUtc => throw new NotImplementedException();

    public ITrigger Clone()
    {
        throw new NotImplementedException();
    }

    public DateTimeOffset? GetFireTimeAfter(DateTimeOffset? afterTime)
    {
        throw new NotImplementedException();
    }

    public IScheduleBuilder GetScheduleBuilder()
    {
        throw new NotImplementedException();
    }

    public TriggerBuilder<IJob> GetTriggerBuilder()
    {
        throw new NotImplementedException();
    }
}


public class MySimpropTrigger : SimplePropertiesTriggerPersistenceDelegateBase
{
    public override bool CanHandleTriggerType(IOperableTrigger trigger)
    {
        throw new NotImplementedException();
    }

    public override string GetHandledTriggerTypeDiscriminator()
    {
        throw new NotImplementedException();
    }

    protected override SimplePropertiesTriggerProperties GetTriggerProperties(IOperableTrigger trigger)
    {
        throw new NotImplementedException();
    }

    protected override TriggerPropertyBundle GetTriggerPropertyBundle(SimplePropertiesTriggerProperties properties)
    {
        throw new NotImplementedException();
    }
}


public class MyCalendar : BaseCalendar
{
    public string? Description { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }
    public ICalendar? CalendarBase { get => throw new NotImplementedException(); set => throw new NotImplementedException(); }

    public ICalendar Clone()
    {
        throw new NotImplementedException();
    }

    public DateTimeOffset GetNextIncludedTimeUtc(DateTimeOffset timeUtc)
    {
        throw new NotImplementedException();
    }

    public bool IsTimeIncluded(DateTimeOffset timeUtc)
    {
        throw new NotImplementedException();
    }
}
