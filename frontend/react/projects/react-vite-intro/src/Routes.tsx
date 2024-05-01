import { Router } from '@lib/Router'

import { ROUTES } from '@constants/routes';
import Main from '@pages/Main'
import About from '@pages/About';
import PageNotFound from '@pages/PageNotFound';

const routes = {
    [ROUTES.MAIN]: (
        <Main/>
    ),

    [ROUTES.ABOUT]: (
        <About />
    ),

    '': (
        <PageNotFound />
    )
}

export const Routes = () => {
    return <Router routes={routes} />;
}