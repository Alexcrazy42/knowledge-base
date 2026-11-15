-- Один контейнер Postgres, две независимые базы: у Hangfire и Quartz
-- разные схемы и разные жизненные циклы, поэтому смешивать их не стоит.
CREATE DATABASE hangfire_demo;
CREATE DATABASE quartz_demo;
