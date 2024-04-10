#include <iostream>

using namespace std;

void printArray(int ar[], int n)
{
    for(int i = 0; i < n; i++)
    {
        cout << ar[i] << " ";
    }
    cout << endl;
}

void insertionSort(int ar[], int n)
{
    for(int i = 1; i < n; i++)
    {
        bool onPlace = false;
        for(int j = i; j > 0; j--)
        {
            if(ar[j] < ar[j-1])
            {
                int temp = ar[j];
                ar[j] = ar[j-1];
                ar[j-1] = temp;
            }
            else
            {
                onPlace = true;
                break;
            }
        }
        if(onPlace == true)
        {
            continue;
        }
    }
}

int main()
{
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int size = sizeof(arr) / sizeof(int);
    insertionSort(arr, size);
    cout << "insertion sort: " << endl;
    printArray(arr, size);
    return 0;
}