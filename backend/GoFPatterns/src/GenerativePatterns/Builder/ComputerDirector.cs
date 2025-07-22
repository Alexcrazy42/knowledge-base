namespace Self.Patterns.GenerativePatterns.Builder;

public class ComputerDirector
{
    private IComputerBuilder builder;

    public ComputerDirector(IComputerBuilder builder)
    {
        this.builder = builder;
    }

    public void BuildGamingComputer()
    {
        builder.SetCpu("Intel Core i9");
        builder.SetGpu("NVIDIA RTX 4090");
        builder.SetRam(32);
        builder.SetStorage(1000);
        builder.SetSsd(true);
    }

    public void BuildOfficeComputer()
    {
        builder.SetCpu("Intel Core i5");
        builder.SetGpu("Intel UHD Graphics");
        builder.SetRam(8);
        builder.SetStorage(500);
        builder.SetSsd(false);
    }
}
