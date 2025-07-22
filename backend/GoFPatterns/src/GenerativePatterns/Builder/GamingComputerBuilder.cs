namespace Self.Patterns.GenerativePatterns.Builder;

public class GamingComputerBuilder : IComputerBuilder
{
    private Computer computer = new Computer();

    public void SetCpu(string cpu) => computer.Cpu = cpu;
    public void SetGpu(string gpu) => computer.Gpu = gpu;
    public void SetRam(int ram) => computer.Ram = ram;
    public void SetStorage(int storage) => computer.Storage = storage;
    public void SetSsd(bool hasSsd) => computer.HasSsd = hasSsd;

    public Computer GetComputer() => computer;
}
