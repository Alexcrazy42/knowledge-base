создание структуры
задание нужно чисто для отработки запросов

Создание структуры:

```
CREATE TABLE IF NOT EXISTS movies (
	id BIGSERIAL PRIMARY KEY, 
	title TEXT NOT NULL,
	year SERIAL NOT NULL,
	director TEXT
);

CREATE TABLE IF NOT EXISTS reviewers (
	id BIGSERIAL PRIMARY KEY, 
	name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ratings (
	id BIGSERIAL NOT NULL,
	movie_id BIGSERIAL NOT NULL,
	reviewer_id BIGSERIAL NOT NULL,
	stars BIGINT NOT NULL,
	rating_date TIMESTAMP,
	
	CONSTRAINT fk_reviewers
		FOREIGN KEY (reviewer_id)
			REFERENCES reviewers(id),
	
	CONSTRAINT fk_movies
		FOREIGN KEY (movie_id)
			REFERENCES movies(id)
);
```

```
INSERT INTO movies (id, title, year, director) VALUES
(101, 'Gone with the Wind',	1939, 'Victor Fleming'),
(102, 'Star Wars',	1977, 'George Lucas'),
(103, 'The Sound of Music',	1965, 'Robert Wise'),
(104, 'E.T.', 1982, 'Steven Spielberg'),
(105, 'Titanic', 1997, 'James Cameron'),
(106, 'Snow White',	1937, NULL),
(107, 'Avatar',	2009, 'James Cameron'),
(108, 'Raiders of the Lost Ark', 1981, 'Steven Spielberg');

INSERT INTO reviewers (id, name) VALUES
(201, 'Sarah Martinez'),
(202, 'Daniel Lewis'),
(203, 'Brittany Harris'),
(204, 'Mike Anderson'),
(205, 'Chris Jackson'),
(206, 'Elizabeth Thomas'),
(207, 'James Cameron'),
(208, 'Ashley White');

INSERT INTO ratings (reviewer_id, movie_id, stars, rating_date) VALUES
(201, 101, 2, '2011-01-22'),
(201, 101, 4, '2011-01-27'),
(202, 106, 4, NULL),
(203, 103, 2, '2011-01-20'),
(203, 108, 4, '2011-01-12'),
(203, 108, 2, '2011-01-30'),
(204, 101, 3, '2011-01-09'),
(205, 103, 3, '2011-01-27'),
(205, 104, 2, '2011-01-22'),
(205, 108, 4, NULL),
(206, 107, 3, '2011-01-15'),
(206, 106, 5, '2011-01-19'),
(207, 107, 5, '2011-01-20'),
(208, 104, 3, '2011-01-02');


// Запросы
SELECT "title" FROM movies where "director" = 'Steven Spielberg'; /*1*/

SELECT * FROM movies where year > 1980; /*2*/

SELECT "year" FROM movies 
	join (SELECT "movie_id" from ratings where stars >= 4) as ratings
	on movies.id = ratings.movie_id; /*3*/
	
SELECT "title" FROM movies 
	join (SELECT "movie_id" from ratings where stars is NULL) as ratings
	on movies.id = ratings.movie_id; /*4*/
	
SELECT "name" FROM reviewers
	join (SELECT "reviewer_id" from ratings where rating_date is NULL) as ratings
	on reviewers.id = ratings.reviewer_id; /*5*/
	
SELECT "name" FROM reviewers
	join (SELECT "reviewer_id" from ratings where movie_id = 
		  (
			  SELECT "id" from movies WHERE title='Gone with the Wind'
		  )
		 ) as ratings
	on reviewers.id = ratings.reviewer_id
ORDER BY "name"; /*6*/

SELECT reviewers.name, movies.title, stars, rating_date FROM ratings
	join (SELECT "id","name" from reviewers) as reviewers
	on ratings.reviewer_id = reviewers.id
	join (SELECT "id","title" from movies) as movies
	on ratings.movie_id = movies.id; /*7*/
	
SELECT id, name from reviewers
	UNION 
SELECT id, title from movies; /*8*/

SELECT "title" from movies
	JOIN (SELECT "reviewer_id", "movie_id" from ratings where "reviewer_id" not in
		  (SELECT "id" from reviewers where "name" != 'Chris Jackson'))
		  as ratings
	on movies.id = ratings.movie_id; /*9*/
	
SELECT "id", "title", ratings_avg.avg_stars from movies 
	JOIN 
(SELECT "movie_id", AVG("stars") as avg_stars FROM ratings GROUP BY "movie_id") as ratings_avg
	on movies.id = ratings_avg.movie_id; /*10*/
	
SELECT "id", "name", ratings_count.cnt FROM reviewers
	JOIN
(SELECT "reviewer_id", COUNT(*) as cnt FROM ratings GROUP BY "reviewer_id") as ratings_count
	ON reviewers.id = ratings_count.reviewer_id
	WHERE cnt >= 3; /*11*/
	
SELECT DISTINCT grouped_directors.director, grouped_directors.cnt FROM movies	
	JOIN
(SELECT "director", COUNT(*) AS cnt FROM movies
	GROUP BY director) as grouped_directors
	on movies.director = grouped_directors.director
	JOIN
(SELECT "title" from movies) as movies_names
	on movies.title = movies_names.title
WHERE grouped_directors.cnt > 1;
```