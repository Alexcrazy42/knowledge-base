const routes = {
    // Главная
    MAIN: '/',

    SETTINGS: '/settings',

    HR_EMPLOYEES: '/hr-employees'
}

// Удалить возможные "//" вначале урла
for (const key in routes) {
    let val = routes[key] as string;
    if (val.indexOf('//') === 0) {
        val = val.substring(1);
    }

    routes[key] = val;
}

export const ROUTES = routes;