using aspnet_docker.Models;
using aspnet_docker.Data.Interfaces;


namespace aspnet_docker.Data
{
    public class DatabaseStub : IDbContext
    {
        public List<Person> persons = new List<Person>()
        {
            new Person() {Id = 1, LastName = "Иванов", FirstName = "Иван"},
            new Person() {Id = 2, LastName = "Петров", FirstName = "Виктор"},
            new Person() {Id = 3, LastName = "Сидоров", FirstName = "Олег"},
            new Person() {Id = 4, LastName = "Иванова", FirstName = "Дарья"}
        };

        public Person GetById(int id)
        {
            Person? personById = persons.Find(p => p.Id == id);
            return personById;
        }


    }
}


