import React, { useCallback, useEffect, useRef, useState } from 'react';
import { currentRoute, Link, redirect } from '@lib/Router';
//import styles from './styles.module.scss';
import { ROUTES } from "@constants/routes"

interface IMainLayoutProps {
    children: React.ReactNode;
    privateRoute?: boolean;
}

export const MainLayout = (props: IMainLayoutProps) => {
    const { children, privateRoute } = props;

    return (
        <div>
            <div >
                <Link to={ROUTES.MAIN}>Главная</Link>
                <Link to={ROUTES.HR_EMPLOYEES}>Hr-ы</Link>
                <Link to={ROUTES.SETTINGS}>Настройки</Link>
            </div>

            <div>
                {children}
            </div>
        </div>
    );
}