import { Router } from '@lib/Router'

import { ROUTES } from '@constants/routes';
import Main from '@pages/Main'
import Settings from '@pages/Settings';
import PageNotFound from '@pages/PageNotFound';
import HrEmployees from '@pages/HrEmployees';
import { MainLayout } from '@layouts/main';

const routes = {
    [ROUTES.MAIN]: (
        <MainLayout privateRoute>
            <Main/>
        </MainLayout>
        
    ),

    [ROUTES.SETTINGS]: (
        <MainLayout privateRoute>
            <Settings />
        </MainLayout>
    ),

    [ROUTES.HR_EMPLOYEES]: (
        <MainLayout privateRoute>
            <HrEmployees />
        </MainLayout>
    ),

    '': (
        <MainLayout privateRoute>
            <PageNotFound />
        </MainLayout>
        
    )
}

export const Routes = () => {
    return <Router routes={routes} />;
}