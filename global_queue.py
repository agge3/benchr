import IQueue

MAX = 1024
queue = GlobalQueue(max)

# TESTS
'''
for i in range(0, 100):
    queue.push(i)

if (queue.size() != 100):
    print("INCORRECT SIZE\n")
else:
    print("CORRECT SIZE\n")

for i in range(0, 100):
    queue.pop()

if (queue.size() != 0):
    print("INCORRECT SIZE\n")
else:
    print("CORRECT SIZE\n")

for i in range(0, 3001):
    ret = queue.push(i)

    
if ret == False:
    print("MAXSIZE REACHED")
else:
    print("MAXSIZE VIOLATED")
'''
