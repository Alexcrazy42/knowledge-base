import { createRouter, createWebHistory } from 'vue-router';

// Импортируем компоненты страниц
import HomePage from '../components/HomePage.vue';
import AboutPage from '../components/AboutPage.vue';

// Определяем маршруты
const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomePage,
    },
    {
        path: '/about',
        name: 'About',
        component: AboutPage,
    },
];

// Создаем и экспортируем объект роутера
const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

export default router;
