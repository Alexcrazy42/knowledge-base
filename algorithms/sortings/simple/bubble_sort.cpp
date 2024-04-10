#include <iostream>

using namespace std;

void bubbleSort(int numbers[], int size)
{
    for(int i = 0; i < size; i++)
    {
        for (int j = 0; j < size-i-1; j++)
        {
            if(numbers[j] > numbers[j+1])
            {
                int temp = numbers[j];
                numbers[j] = numbers[j+1];
                numbers[j+1] = temp;
            }
        }
    }
}

void printArray(int arr[], int size)
{
    for(int i = 0; i < size; i++)
    {
        cout << arr[i] << " ";
    }
}

int main()
{
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int size = sizeof(arr) / sizeof(int);
    bubbleSort(arr, size);
    cout << "Bubble sort: " << endl;
    printArray(arr, size);
    return 0;
}