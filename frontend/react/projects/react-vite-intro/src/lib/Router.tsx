import React, { useCallback, useEffect, useState } from 'react';
import { reactive, reaction } from '@lib/reactive';
import { observer } from '@lib/reactive/react_bindings';
import { pathToRegexp } from 'path-to-regexp';
import { anyObject } from '@declarations/types';
import { EventEmitter } from '@lib/EventEmitter';

type RouterEvents = {
    navigate: () => any;
};
const eventEmitter = new EventEmitter<RouterEvents>();

function exec(re: RegExp, str: string, keys = []) {
    const match = re.exec(str);

    if (match === null) {
        return null;
    }

    const paramsValues = match.slice(1);
    let result = {};
    for (let i = 0; i < paramsValues.length; i++) {
        const paramValue = paramsValues[i];
        const paramName = keys[i].name;

        result[paramName] = paramValue;
    }

    return result;
}

export function redirect(to: string, replace = false, title = '') {
    const currentFullPath = window.location.href.substr(window.location.origin.length);
    if (currentFullPath === to) {
        return;
    }

    if (currentRoute.hashMode) {
        to = '#' + to;
    }

    if (replace) {
        history.replaceState({}, title, to);
    } else {
        history.pushState({}, title, to);
    }

    currentRoute.setCurrentRoute();
}

class CurrentRoute {
    currentLocation = {
        path: '',
        fullPath: '',
        location: {
            hash: '',
            host: '',
            hostname: '',
            href: '',
            origin: '',
            pathname: '',
            port: '',
            protocol: '',
            search: '',
        },
    };
    fullPath = window.location.pathname + window.location.search;
    __routeParams: anyObject = {};
    currentRegExp: RegExp = null;
    searchParams: anyObject = {};
    hashMode = false;

    routeParams = <T extends anyObject>() => {
        return this.__routeParams as T;
    };

    constructor() {
        reactive(this);
        this.setCurrentRoute();

        window.addEventListener('popstate', this.setCurrentRoute);
        window.addEventListener('hashchange', this.setCurrentRoute);

        reaction(
            () => {
                return JSON.stringify(this.currentLocation);
            },
            () => {
                eventEmitter.emit('navigate');
            },
        );
    }

    setCurrentRoute = () => {
        const windowLocation = JSON.parse(JSON.stringify(window.location));

        let path, fullPath;

        if (this.hashMode) {
            const hashPath = windowLocation.hash.substr(1);
            const parsedURL = new URL(hashPath, windowLocation.origin);
            path = parsedURL.pathname;
            fullPath = hashPath;
        } else {
            path = windowLocation.pathname;
            fullPath = path + windowLocation.search;
        }

        const parsedURL = new URL(fullPath, windowLocation.origin);
        const searchParams = Object.fromEntries(parsedURL.searchParams.entries());
        this.searchParams = searchParams;

        const route = {
            path,
            fullPath,
            location: windowLocation,
        };

        this.currentLocation = route;
        eventEmitter.emit('navigate');
    };
}

export const currentRoute = new CurrentRoute();

let globalRoutersCount = 0;

interface IRoutes {
    [k: string]: JSX.Element;
}

class RouterState {
    global = false;
    currentComponent = null;
    routes: IRoutes = {};
    disposer: () => any = null;

    constructor(routes: IRoutes, global: boolean) {
        this.routes = routes;
        this.global = global;

        reactive(this);

        this.disposer = eventEmitter.on('navigate', this.navigate);
        this.navigate();
    }

    onUnmount = () => {
        this.disposer();
    };

    navigate = () => {
        const { routes } = this;
        let result = routes[''] || routes['*'] || null;

        let isRouteFound = false;

        const { path } = currentRoute.currentLocation;

        for (const route in routes) {
            if (!routes.hasOwnProperty(route)) {
                continue;
            }
            if (route === '' || route === '*') {
                continue;
            }
            const component = routes[route];

            let routePath = route;
            if (routePath.substr(-1) === '/') {
                routePath = routePath.substr(0, routePath.length - 1);
            }

            const keys = [];
            const regexp = pathToRegexp(routePath, keys);
            const res = exec(regexp, path, keys);

            if (res) {
                isRouteFound = true;
                result = component;

                for (const key in res) {
                    if (res[key] !== undefined) {
                        res[key] = decodeURI(res[key]);
                    }
                }

                // Set global route params only from global router, not from local
                if (this.global) {
                    currentRoute.__routeParams = res;
                    currentRoute.currentRegExp = regexp;
                } else {
                    currentRoute.__routeParams = {};
                }

                break;
            }
        }

        if (!isRouteFound) {
            currentRoute.__routeParams = {};
            currentRoute.currentRegExp = pathToRegexp(currentRoute.currentLocation.path, []);
        }

        this.currentComponent = result;
    };
}

interface IRouterProps {
    //  key-value object where key is route and value is what must to rendered. If key is "" or "*" that means Page not found
    routes: IRoutes;
    // mark router as global for populate currentRoute.routeParams and currentRoute.currentRegExp
    global?: boolean;
    // hash router instead of regular url's
    hashMode?: boolean;
}

export const Router = observer(({ routes, global = false, hashMode = false }: IRouterProps) => {
    const [state] = useState(() => new RouterState(routes, global));

    useEffect(() => state.onUnmount, []);

    useEffect(() => {
        if (global) {
            globalRoutersCount++;
        }
        if (globalRoutersCount > 1) {
            throw new Error(`Only 1 router exemplar can be global`);
        }

        return () => {
            globalRoutersCount--;
        };
    }, []);

    useEffect(() => {
        currentRoute.hashMode = Boolean(hashMode);
        if (hashMode && window.location.hash === '') {
            window.location.hash = '/';
        }
        currentRoute.setCurrentRoute();
    }, [hashMode]);

    return state.currentComponent;
});

interface ILinkProps {
    // link url
    to: string;
    // mark active only if to === currentLocation.fullPath instead of current global route regexp match
    exact?: boolean;
    // Don't ignore hash when exact active
    dontIgnoreHash?: boolean;
    // callback function that tells is link active or not
    grabActive?: (active: boolean) => any;
    //  class that applied when url related to this Link
    activeClass?: string;
    children?: React.ReactNode;
    className?: string;
    htmlAttrs?: React.HTMLAttributes<HTMLAnchorElement>;
}

export const Link = observer((props: ILinkProps) => {
    const {
        to,
        exact = false,
        dontIgnoreHash = false,
        grabActive = null,
        activeClass = null,
        children = null,
        className = null,
        htmlAttrs = {},
    } = props;
    const [state] = useState(() => reactive({ active: false }));

    useEffect(
        () => reaction(
            () => {
                const { currentRegExp, currentLocation } = currentRoute;

                return [to, exact, currentLocation, currentRegExp];
            },
            () => {
                calcActive();
            },
        ),
        [],
    );

    const handleClick = useCallback((e) => {
        e.preventDefault();

        redirect(to);
    }, []);

    const calcActive = useCallback(() => {
        const { currentRegExp, currentLocation } = currentRoute;

        let active = false;
        if (exact) {
            if (dontIgnoreHash && !currentRoute.hashMode) {
                active = to === currentLocation.fullPath + currentLocation.location.hash;
            } else {
                active = to === currentLocation.fullPath;
            }
        } else if (currentRegExp && currentRegExp.exec(to)) {
            active = true;
        }

        if (active !== state.active) {
            state.active = active;
            grabActive && grabActive(active);
        }
    }, []);

    useEffect(calcActive, []);

    let classNames = [];
    if (className) {
        classNames.push(className);
    }
    if (activeClass && state.active) {
        classNames.push(activeClass);
    }

    return (
        <a {...htmlAttrs} className={classNames.join(' ')} href={to} data-active={state.active} onClick={handleClick}>
            {children}
        </a>
    );
});
