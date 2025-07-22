namespace Self.Patterns.GenerativePatterns.Builder;

public interface IComputerBuilder
{
    void SetCpu(string cpu);
    void SetGpu(string gpu);
    void SetRam(int ram);
    void SetStorage(int storage);
    void SetSsd(bool hasSsd);
    Computer GetComputer();
}
