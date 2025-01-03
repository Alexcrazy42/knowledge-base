# ORM 
ORM (Object-Relational Mapping) - это подход к работе с базами данных, который позволяет программистам использовать объектно-ориентированный подход при работе с данными, хранящимися в реляционных базах данных


C# популярные орм: ef core/linq, linq2db, dapper


такой код генерирует join, поэтому schoolClassId делаем как новое поле
return await libraryDbContext.Students
    .Where(x => x.SchoolClass.Id == classId)
    .ToListAsync(cancellationToken);