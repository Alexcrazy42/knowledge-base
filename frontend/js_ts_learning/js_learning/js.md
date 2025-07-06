ECMAScript5 - строгий режим

- React
- TypeScript
- React Query
- Styled Components
- Zustand
- Jest + RTL
- Husky + Prettier + ESLint + JSLint

XSS
проверить: OWASP ZAP, Burp Suite, XSS Payloads

SameOrigin, CORS
CSRF

WindowProxy



класс Node, подклассы: html элементы - Element, узлы с текстом - Text, Document, Element и Text
NodeList, HtmlCollection

Node: parentNode, childNodes, firstChild, lastChild, subling (братья), nodeType, nodeValue (Text, Comment)
Element: firstElementChild, nextElementSubling

document: cookie, domain, lastModified, location, referrer, title, URL, 



CSS:
position:

1. static - дефолт, выводится в соответствии с нормальным потоком вывода документа. не могут позиционироваться с помощью top, left и других
2. absolute - не входит в поток статически позиционируемых элементов. позиционируется относительно ближайшего позиционированного предка (любого элемента отличного от static). используется для точного позиционирования внутри контейнеров
3. fixed - зафиксировать положение элемента, относительно окна браузера. не прокручивается. полезен для липких заголовков, панелей
4. relative - в основном потоке, позиционируется относительно места, где должен был находиться (для дочерних элементов подходит)
5. sticky - комбинация relative и fixed. ведет себя как обычный блок (relative) до тех пор, пока не достигнет указанной позициии относительно viewport. после этого он становится липким и остается на месте дальнейшей прокрутки. 

наследование: inherit, initial, unset



10 глава регулярки
15.8. геометрия документа и элементов и прокрутка

таблица 15.1. 430 страница - элементы HTML-форм
формы классический html/js (кнопки, переключатели, текстовые поля ввода, select/options) + (react-hook-form + Zod / Yup / Joi)

17 - события
21 - работа с графикой и медиафайлами (video, img, audio, canvas) (665 - события мультимедийных элементов)

22.1 - геопозиционирование
22.2 - управление историей посещений
22.3 - взаимодействие документов с разным происхождением
22.4 - фоновые потоки выполнения