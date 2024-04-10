#include <iostream>
#include <limits.h>
using namespace std;

void printArray(int arr[], int size)
{
    for(int i = 0; i < size; i++)
    {
        cout << arr[i] << " ";
    }
    cout << endl;
}

void selectionSort(int numbers[], int size)
{
    for(int i = 0; i < size; i++)
    {
        int min_value = INT_MAX;
        int min_value_index = i;
        for(int j = i; j < size; j++)
        {
            if(numbers[j] < min_value)
            {
                min_value = numbers[j];
                min_value_index = j;
            }
        }
        int temp = numbers[i];
        numbers[i] = numbers[min_value_index];
        numbers[min_value_index] = temp;
    }
}



int main()
{
    int arr[] = {32, 90, 34, 25, 62, 12, 22, 11, 10};
    int size = sizeof(arr) / sizeof(int);
    selectionSort(arr, size);
    cout << "Selection sort: " << endl;
    printArray(arr, size);
    return 0;
}